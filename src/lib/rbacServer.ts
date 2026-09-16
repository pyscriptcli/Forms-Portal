import "server-only";

import { promises as fs } from "fs";
import path from "path";
import { DEFAULT_USERS, type UserAccessRecord, type UserRole } from "@/lib/rbac";

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

export async function resolveUserRole(user: { email?: string; username?: string } | null): Promise<UserRole> {
  const email = (user?.email || "").trim().toLowerCase();
  const username = (user?.username || "").trim().toLowerCase();
  const users = await readRbacUsers();
  const record = users.find(
    (candidate) =>
      candidate.status === "active" &&
      (candidate.email.trim().toLowerCase() === email || candidate.name.trim().toLowerCase() === username),
  );

  return record?.role || "requestor";
}
