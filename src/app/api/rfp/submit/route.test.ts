import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  getServerAuthSession: vi.fn(),
  fetchClickUpUser: vi.fn(),
}));

vi.mock("@/lib/clickup", () => ({
  getClickUpConfig: vi.fn(() => ({ isConfigured: true, token: "oauth-token" })),
  createClickUpTask: vi.fn(),
  updateClickUpTask: vi.fn(),
  uploadAttachmentToTask: vi.fn(),
  deleteClickUpTask: vi.fn(),
  readNextRfpReferenceFromClickUp: vi.fn(),
}));

vi.mock("@/lib/supabaseAdmin", () => ({
  readFormDestinationFromSupabase: vi.fn(),
  readWorkflowStatusesFromSupabase: vi.fn(),
}));

vi.mock("@/lib/email", () => ({ sendApproverNotification: vi.fn() }));

import { POST } from "./route";
import { fetchClickUpUser, getServerAuthSession } from "@/lib/auth";
import { createClickUpTask, deleteClickUpTask, readNextRfpReferenceFromClickUp, uploadAttachmentToTask } from "@/lib/clickup";
import { readFormDestinationFromSupabase, readWorkflowStatusesFromSupabase } from "@/lib/supabaseAdmin";

function submissionRequest(files: File[]) {
  const body = new FormData();
  body.append("formType", "rfp");
  body.append("data", JSON.stringify({ date: "09/16/2026", payee: "Vendor", purpose: "Supplies" }));
  body.append("pdf", files[0]);
  files.slice(1).forEach((file) => body.append("supportingFiles", file));
  return {
    headers: new Headers({ host: "localhost:3000" }),
    formData: async () => body,
  } as any;
}

describe("atomic RFP submission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getServerAuthSession).mockResolvedValue({ accessToken: "oauth-token", user: null });
    vi.mocked(fetchClickUpUser).mockResolvedValue({ id: "user-1", email: "owner@example.com", username: "Owner" });
    vi.mocked(readFormDestinationFromSupabase).mockResolvedValue({ enabled: true, listId: "list-1", workspaceId: "workspace-1" } as never);
    vi.mocked(readWorkflowStatusesFromSupabase).mockResolvedValue({ requestorFormSubmission: "REQUESTOR FORM SUBMISSION" } as never);
    vi.mocked(readNextRfpReferenceFromClickUp).mockResolvedValue({ reference: "RFP-092026-0009", lastSequence: 8 });
    vi.mocked(createClickUpTask).mockResolvedValue({ id: "task-1", url: "https://app.clickup.com/t/task-1", name: "Request", isMock: false } as never);
    vi.mocked(deleteClickUpTask).mockResolvedValue(undefined);
  });

  it("deletes a newly created task when any attachment upload fails", async () => {
    vi.mocked(uploadAttachmentToTask)
      .mockResolvedValueOnce({ success: true })
      .mockResolvedValueOnce({ success: false, error: "ClickUp rejected attachment" });

    const response = await POST(submissionRequest([
      new File(["pdf"], "form.pdf", { type: "application/pdf" }),
      new File(["support"], "quote.pdf", { type: "application/pdf" }),
    ]));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.success).toBe(false);
    expect(deleteClickUpTask).toHaveBeenCalledWith("task-1", "oauth-token");
  });

  it("rejects a combined payload above 4 MB before creating a task", async () => {
    const response = await POST(submissionRequest([
      new File([new Uint8Array(4 * 1024 * 1024)], "form.pdf", { type: "application/pdf" }),
      new File(["support"], "quote.pdf", { type: "application/pdf" }),
    ]));

    expect(response.status).toBe(413);
    expect(createClickUpTask).not.toHaveBeenCalled();
    expect(uploadAttachmentToTask).not.toHaveBeenCalled();
  });
});
