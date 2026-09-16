import { describe, it, expect, beforeEach } from "vitest";
import {
  ROLE_DEFINITIONS,
  DEFAULT_USERS,
  getLocalRbacUsers,
  saveLocalRbacUsers,
  RBAC_STORAGE_KEY,
  UserAccessRecord,
} from "@/lib/rbac";

describe("RBAC definitions and storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("contains all 4 primary roles with permissions", () => {
    expect(ROLE_DEFINITIONS.admin).toBeDefined();
    expect(ROLE_DEFINITIONS.approver).toBeDefined();
    expect(ROLE_DEFINITIONS.finance).toBeDefined();
    expect(ROLE_DEFINITIONS.requestor).toBeDefined();

    expect(ROLE_DEFINITIONS.admin.permissions.length).toBeGreaterThan(0);
    expect(ROLE_DEFINITIONS.approver.permissions.length).toBeGreaterThan(0);
    expect(ROLE_DEFINITIONS.finance.permissions.length).toBeGreaterThan(0);
    expect(ROLE_DEFINITIONS.requestor.permissions.length).toBeGreaterThan(0);
  });

  it("returns DEFAULT_USERS when storage is empty", () => {
    const users = getLocalRbacUsers();
    expect(users).toEqual(DEFAULT_USERS);
  });

  it("saves and retrieves users from localStorage", () => {
    const customUsers: UserAccessRecord[] = [
      {
        id: "usr-custom",
        name: "Test User",
        email: "test@example.com",
        department: "Operations",
        role: "approver",
        status: "active",
      },
    ];

    saveLocalRbacUsers(customUsers);
    const retrieved = getLocalRbacUsers();
    expect(retrieved).toEqual(customUsers);
  });
});
