import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/clickup", () => ({
  getClickUpConfig: vi.fn(),
  getListCustomFields: vi.fn(),
  getListTasks: vi.fn(),
  getClickUpTaskTimeInStatus: vi.fn(),
  setTaskCustomFieldValue: vi.fn(),
  createClickUpWebhook: vi.fn(),
}));

vi.mock("@/lib/supabaseAdmin", () => ({
  isSupabaseAdminConfigured: vi.fn(() => true),
  readFormDestinationFromSupabase: vi.fn(),
  readPortalSettingsFromSupabase: vi.fn(),
  readWorkflowStatusesFromSupabase: vi.fn(),
  savePortalSettingsToSupabase: vi.fn(),
}));

import { POST } from "./route";
import {
  getClickUpConfig,
  getClickUpTaskTimeInStatus,
  getListCustomFields,
  getListTasks,
  setTaskCustomFieldValue,
} from "@/lib/clickup";
import {
  readFormDestinationFromSupabase,
  readWorkflowStatusesFromSupabase,
} from "@/lib/supabaseAdmin";

describe("admin ClickUp timestamp synchronization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(readFormDestinationFromSupabase).mockResolvedValue({
      enabled: true,
      listId: "list-1",
      workspaceId: "workspace-1",
    } as never);
    vi.mocked(readWorkflowStatusesFromSupabase).mockResolvedValue({
      requestorFormSubmission: "REQUESTOR FORM SUBMISSION",
    } as never);
    vi.mocked(getClickUpConfig).mockReturnValue({
      token: "server-token",
      listId: "list-1",
      isConfigured: true,
      isOAuth: false,
    });
    vi.mocked(getListCustomFields).mockResolvedValue([
      { id: "submission-ts-id", name: "TS RFP - Requestor Form Submission", type: "date" },
    ] as never);
    vi.mocked(getListTasks).mockResolvedValue([
      {
        id: "task-1",
        custom_fields: [
          { id: "submission-ts-id", name: "TS RFP - Requestor Form Submission", type: "date", value: null },
        ],
      },
    ]);
    vi.mocked(getClickUpTaskTimeInStatus).mockResolvedValue({
      current_status: {
        status: "REQUESTOR FORM SUBMISSION",
        total_time: { since: "1789617000000" },
      },
      status_history: [],
    });
    vi.mocked(setTaskCustomFieldValue).mockResolvedValue(true);
  });

  it("writes the ClickUp status-entry timestamp into the missing TS field", async () => {
    const request = new Request("http://localhost/api/admin/clickup-fields", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-token": "prime-admin-token-v1" },
      body: JSON.stringify({ action: "sync_task_timestamps" }),
    }) as never;

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(setTaskCustomFieldValue).toHaveBeenCalledWith(
      "task-1",
      "submission-ts-id",
      1789617000000,
      "server-token",
    );
    expect((await response.json()).timestampsWritten).toBe(1);
  });
});
