import "server-only";

import { readRbacUsersFromSupabase } from "@/lib/supabaseAdmin";
import type { UserRole } from "@/lib/rbac";

export async function resolveUserRole(user: { email?: string; username?: string } | null): Promise<UserRole> {
  const email = (user?.email || "").trim().toLowerCase();
  const username = (user?.username || "").trim().toLowerCase();
  const users = await readRbacUsersFromSupabase();
  const record = users.find(
    (candidate) =>
      candidate.status === "active" &&
      (candidate.email.trim().toLowerCase() === email || candidate.name.trim().toLowerCase() === username),
  );

  return record?.role || "requestor";
}
