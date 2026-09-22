import "server-only";

import { readRbacConfiguration } from "@/lib/supabaseAdmin";
import { roleFromPermissions, type UserRole, type PortalPermission } from "@/lib/rbac";

export async function resolveUserAccess(user: { email?: string; username?: string } | null): Promise<{ role: UserRole; permissions: PortalPermission[] }> {
  const email = (user?.email || "").trim().toLowerCase();
  const username = (user?.username || "").trim().toLowerCase();
  const { users, defaultPermissions } = await readRbacConfiguration();
  const record = users.find((candidate) => candidate.email.trim().toLowerCase() === email)
    || users.find((candidate) => candidate.name.trim().toLowerCase() === username);
  if (record) {
    const permissions = record.status === "active" ? (record.permissions || []) : [];
    return { role: roleFromPermissions(permissions), permissions };
  }
  return { role: roleFromPermissions(defaultPermissions), permissions: defaultPermissions };
}

export async function resolveUserRole(user: { email?: string; username?: string } | null): Promise<UserRole> {
  return (await resolveUserAccess(user)).role;
}
