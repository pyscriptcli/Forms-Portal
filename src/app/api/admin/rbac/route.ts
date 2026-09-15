import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { ADMIN_TOKEN } from "@/lib/adminSettings";
import { DEFAULT_USERS, ROLE_DEFINITIONS, UserAccessRecord } from "@/lib/rbac";
import {
  fetchRbacUsersFromClickUp,
  saveRbacUsersToClickUp,
  DEFAULT_RBAC_LIST_ID,
} from "@/lib/clickupRbac";

const RBAC_FILE_PATH = path.join(process.cwd(), "src", "lib", "rbacData.json");

async function readFallbackRbacUsers(): Promise<UserAccessRecord[]> {
  try {
    const raw = await fs.readFile(RBAC_FILE_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_USERS;
  } catch {
    return DEFAULT_USERS;
  }
}

async function writeFallbackRbacUsers(users: UserAccessRecord[]) {
  try {
    await fs.writeFile(RBAC_FILE_PATH, JSON.stringify(users, null, 2), "utf8");
  } catch {
    // Non-critical fallback
  }
}

export async function GET() {
  const clickUpResult = await fetchRbacUsersFromClickUp();
  let users = clickUpResult.users;

  if (clickUpResult.source === "fallback") {
    const fallbackUsers = await readFallbackRbacUsers();
    if (fallbackUsers && fallbackUsers.length > 0) {
      users = fallbackUsers;
    }
  }

  return NextResponse.json({
    users,
    roles: ROLE_DEFINITIONS,
    source: clickUpResult.source,
    listId: clickUpResult.listId,
    clickUpUrl: `https://app.clickup.com/9014981136/v/li/${clickUpResult.listId}`,
  });
}

export async function POST(req: NextRequest) {
  const token = req.headers.get("x-admin-token");
  if (token !== ADMIN_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    if (!body || !Array.isArray(body.users)) {
      return NextResponse.json(
        { error: "Invalid payload: users array required" },
        { status: 400 }
      );
    }

    const validatedUsers: UserAccessRecord[] = body.users.map((u: any, idx: number) => ({
      id: u.id || `usr-${Date.now()}-${idx}`,
      name: String(u.name || "Unnamed Member").trim(),
      email: String(u.email || "").trim(),
      department: String(u.department || "Operations").trim(),
      role: (["admin", "approver", "finance", "requestor"].includes(u.role)
        ? u.role
        : "requestor") as any,
      status: u.status === "inactive" ? "inactive" : "active",
      updatedAt: new Date().toISOString(),
      clickUpTaskId: u.clickUpTaskId || undefined,
    }));

    // 1. Sync to ClickUp List DB (List 901412841984)
    const clickUpSaveResult = await saveRbacUsersToClickUp(validatedUsers);

    // 2. Save local fallback
    await writeFallbackRbacUsers(clickUpSaveResult.users);

    return NextResponse.json({
      success: true,
      users: clickUpSaveResult.users,
      savedToClickUp: clickUpSaveResult.savedToClickUp,
      listId: clickUpSaveResult.listId,
      clickUpUrl: `https://app.clickup.com/9014981136/v/li/${clickUpSaveResult.listId}`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to update RBAC" },
      { status: 500 }
    );
  }
}
