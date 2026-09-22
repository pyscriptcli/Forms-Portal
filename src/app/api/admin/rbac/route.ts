import { NextRequest, NextResponse } from "next/server";
import { ADMIN_TOKEN } from "@/lib/adminSettings";
import { PORTAL_PERMISSIONS, roleFromPermissions, UserAccessRecord, PortalPermission } from "@/lib/rbac";
import { readRbacConfiguration, saveRbacConfiguration } from "@/lib/supabaseAdmin";


export async function GET() {
  let config;
  try {
    config = await readRbacConfiguration();
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Supabase RBAC is not configured." }, { status: 503 });
  }

  return NextResponse.json({
    ...config,
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

    const clean = (permissions: unknown): PortalPermission[] => Array.isArray(permissions) ? [...new Set(permissions.filter((p): p is PortalPermission => PORTAL_PERMISSIONS.includes(String(p) as PortalPermission)))] : [];
    const validatedUsers: UserAccessRecord[] = body.users.map((u: any, idx: number) => {
      const permissions = clean(u.permissions);
      return {
      id: u.id || `usr-${Date.now()}-${idx}`,
      name: String(u.name || "Unnamed Member").trim(),
      email: String(u.email || "").trim().toLowerCase(),
      department: String(u.department || "Operations").trim(),
      role: roleFromPermissions(permissions),
      status: u.status === "inactive" ? "inactive" : "active",
      updatedAt: new Date().toISOString(),
      clickUpTaskId: u.clickUpTaskId || undefined,
      permissions,
    };
    });
    const emails = new Set<string>();
    if (validatedUsers.some((u) => !u.name || !u.email || emails.has(u.email) || (emails.add(u.email), false))) return NextResponse.json({ error: "Each user requires a unique name and email." }, { status: 400 });
    const defaultPermissions = clean(body.defaultPermissions);

    await saveRbacConfiguration({ users: validatedUsers, defaultPermissions });

    return NextResponse.json({
      success: true,
      users: validatedUsers, defaultPermissions,
      source: "supabase",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to update RBAC" },
      { status: 500 }
    );
  }
}
