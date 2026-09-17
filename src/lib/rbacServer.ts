import "server-only";

import { readRbacUsersFromSupabase } from "@/lib/supabaseAdmin";
import type { UserRole, PortalPermission } from "@/lib/rbac";

export async function resolveUserAccess(user: { email?: string; username?: string } | null): Promise<{ role: UserRole; permissions: PortalPermission[] }> {
  const email = (user?.email || "").trim().toLowerCase();
  const username = (user?.username || "").trim().toLowerCase();
  const users = await readRbacUsersFromSupabase();
  const record = users.find(
    (candidate) =>
      candidate.status === "active" &&
      (candidate.email.trim().toLowerCase() === email || candidate.name.trim().toLowerCase() === username),
  );

  return { role: record?.role || "requestor", permissions: record?.permissions || ["forms", "requests"] };
}

export async function resolveUserRole(user: { email?: string; username?: string } | null): Promise<UserRole> {
  return (await resolveUserAccess(user)).role;
}
