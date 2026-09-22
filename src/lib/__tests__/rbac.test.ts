import { describe, it, expect } from "vitest";
import {
  ROLE_DEFINITIONS,
} from "@/lib/rbac";

describe("RBAC definitions", () => {
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

});
