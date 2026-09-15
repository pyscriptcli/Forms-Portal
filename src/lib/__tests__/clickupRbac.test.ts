import { describe, it, expect } from "vitest";
import {
  parseClickUpTaskToUser,
  buildUserTaskDescription,
  DEFAULT_RBAC_LIST_ID,
  getClickUpRbacConfig,
} from "@/lib/clickupRbac";
import { UserAccessRecord } from "@/lib/rbac";

describe("ClickUp RBAC DB Synchronization", () => {
  it("defaults to ClickUp list ID 901412841984", () => {
    expect(DEFAULT_RBAC_LIST_ID).toBe("901412841984");
    const config = getClickUpRbacConfig();
    expect(config.listId).toBe("901412841984");
  });

  it("builds structured task description with embedded JSON", () => {
    const user: UserAccessRecord = {
      id: "usr-test-1",
      name: "Juan Dela Cruz",
      email: "juan@primephilippines.com",
      department: "Finance",
      role: "finance",
      status: "active",
    };

    const desc = buildUserTaskDescription(user);
    expect(desc).toContain("Juan Dela Cruz");
    expect(desc).toContain("juan@primephilippines.com");
    expect(desc).toContain("finance");
    expect(desc).toContain("```json");
    expect(desc).toContain('"id": "usr-test-1"');
  });

  it("parses ClickUp task with embedded JSON metadata accurately", () => {
    const user: UserAccessRecord = {
      id: "usr-123",
      name: "Maria Santos",
      email: "maria@primephilippines.com",
      department: "CRD",
      role: "approver",
      status: "active",
    };

    const mockTask = {
      id: "task-clickup-888",
      name: "Maria Santos",
      markdown_description: buildUserTaskDescription(user),
      status: { status: "active" },
    };

    const parsed = parseClickUpTaskToUser(mockTask);
    expect(parsed).not.toBeNull();
    expect(parsed?.name).toBe("Maria Santos");
    expect(parsed?.email).toBe("maria@primephilippines.com");
    expect(parsed?.role).toBe("approver");
    expect(parsed?.department).toBe("CRD");
    expect(parsed?.clickUpTaskId).toBe("task-clickup-888");
  });

  it("falls back to markdown and tags parsing if json block is absent", () => {
    const mockTask = {
      id: "task-manual-777",
      name: "Dave Lead",
      description: "- **Email**: dave.lead@primephilippines.com\n- **Department**: Executive\n- **Role**: admin",
      tags: [{ name: "role:admin" }],
      status: { status: "active" },
    };

    const parsed = parseClickUpTaskToUser(mockTask);
    expect(parsed).not.toBeNull();
    expect(parsed?.name).toBe("Dave Lead");
    expect(parsed?.email).toBe("dave.lead@primephilippines.com");
    expect(parsed?.role).toBe("admin");
    expect(parsed?.clickUpTaskId).toBe("task-manual-777");
  });
});
