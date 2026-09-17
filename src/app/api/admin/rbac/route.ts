import { NextRequest, NextResponse } from "next/server";
import { ADMIN_TOKEN } from "@/lib/adminSettings";
import { ROLE_DEFINITIONS, UserAccessRecord } from "@/lib/rbac";
import { readRbacUsersFromSupabase, saveRbacUsersToSupabase } from "@/lib/supabaseAdmin";


export async function GET() {
  let users: UserAccessRecord[];
  try {
    users = await readRbacUsersFromSupabase();
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Supabase RBAC is not configured." }, { status: 503 });
  }

  return NextResponse.json({
    users,
    roles: ROLE_DEFINITIONS,
    source: "supabase",
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

    await saveRbacUsersToSupabase(validatedUsers);

    return NextResponse.json({
      success: true,
      users: validatedUsers,
      source: "supabase",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to update RBAC" },
      { status: 500 }
    );
  }
}
