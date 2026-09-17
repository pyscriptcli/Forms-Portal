import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ getServerAuthSession: vi.fn() }));
vi.mock("@/lib/supabaseAdmin", () => ({ readWorkflowStatusesFromSupabase: vi.fn() }));
vi.mock("@/lib/clickup", () => ({
  approveTaskByApprover: vi.fn(),
  rejectTaskForRevision: vi.fn(),
  getClickUpTask: vi.fn(),
}));
vi.mock("@/lib/email", () => ({ sendRequestorRevisionNotification: vi.fn() }));

import { POST } from "./route";
import { getServerAuthSession } from "@/lib/auth";
import { approveTaskByApprover } from "@/lib/clickup";
import { readWorkflowStatusesFromSupabase } from "@/lib/supabaseAdmin";

describe("RFP approval", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getServerAuthSession).mockResolvedValue({
      accessToken: "oauth-token",
      user: { id: "approver-1", username: "Team Lead", email: "lead@example.com" },
    });
    vi.mocked(readWorkflowStatusesFromSupabase).mockResolvedValue({
      financeValidation: "FINANCE VALIDATION",
    } as never);
    vi.mocked(approveTaskByApprover).mockResolvedValue(true);
  });

  it("uses Supabase workflow configuration and persists the approver endorsement", async () => {
    const request = new Request("http://localhost/api/rfp/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        taskId: "task-1",
        action: "approve",
        approverName: "Team Lead",
        approvalDate: "09/17/2026",
        signatureDataUrl: "data:image/png;base64,c2ln",
        notes: "Approved",
      }),
    });

    const response = await POST(request as never);

    expect(response.status).toBe(200);
    expect(approveTaskByApprover).toHaveBeenCalledWith(
      "task-1",
      "Team Lead",
      "Approved",
      "lead@example.com",
      expect.objectContaining({
        oauthToken: "oauth-token",
        workflowStatuses: expect.objectContaining({ financeValidation: "FINANCE VALIDATION" }),
        approvalDate: "09/17/2026",
        signatureDataUrl: "data:image/png;base64,c2ln",
      })
    );
  });

  it("allows the endorsement action to perform the ClickUp status transition", async () => {
    const request = new Request("http://localhost/api/rfp/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId: "task-1", action: "approve", approverName: "Team Lead" }),
    });

    const response = await POST(request as never);
    expect(response.status).toBe(200);
    expect(approveTaskByApprover).toHaveBeenCalled();
  });
});
