import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { ADMIN_TOKEN } from "@/lib/adminSettings";
import { DEFAULT_USERS, ROLE_DEFINITIONS, UserAccessRecord } from "@/lib/rbac";

const RBAC_FILE_PATH = path.join(process.cwd(), "src", "lib", "rbacData.json");

async function readRbacUsers(): Promise<UserAccessRecord[]> {
  try {
    const raw = await fs.readFile(RBAC_FILE_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_USERS;
  } catch {
    return DEFAULT_USERS;
  }
}

async function writeRbacUsers(users: UserAccessRecord[]) {
  await fs.writeFile(RBAC_FILE_PATH, JSON.stringify(users, null, 2), "utf8");
}

export async function GET() {
  const users = await readRbacUsers();
  return NextResponse.json({
    users,
    roles: ROLE_DEFINITIONS,
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
      return NextResponse.json({ error: "Invalid payload: users array required" }, { status: 400 });
    }

    const validatedUsers: UserAccessRecord[] = body.users.map((u: any, idx: number) => ({
      id: u.id || `usr-${Date.now()}-${idx}`,
      name: String(u.name || "Unnamed Member").trim(),
      email: String(u.email || "").trim(),
      department: String(u.department || "Operations").trim(),
      role: (["admin", "approver", "finance", "requestor"].includes(u.role) ? u.role : "requestor") as any,
      status: u.status === "inactive" ? "inactive" : "active",
      updatedAt: new Date().toISOString(),
    }));

    await writeRbacUsers(validatedUsers);
    return NextResponse.json({ success: true, users: validatedUsers });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to update RBAC" }, { status: 500 });
  }
}
