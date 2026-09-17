import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/clickup", () => ({
  getClickUpTask: vi.fn(),
  setTaskCustomFieldValue: vi.fn(),
  getClickUpConfig: vi.fn(),
}));
vi.mock("@/lib/supabaseAdmin", () => ({
  readFormDestinationFromSupabase: vi.fn(),
  readPortalSettingsFromSupabase: vi.fn(),
  readWorkflowStatusesFromSupabase: vi.fn(),
}));

import { POST } from "./route";
import { getClickUpConfig, getClickUpTask, setTaskCustomFieldValue } from "@/lib/clickup";
import {
  readFormDestinationFromSupabase,
  readPortalSettingsFromSupabase,
  readWorkflowStatusesFromSupabase,
} from "@/lib/supabaseAdmin";

const eventDate = 1789617000000;

function webhookRequest() {
  return new Request("http://localhost/api/clickup/webhook", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event: "taskStatusUpdated",
      task_id: "task-1",
      history_items: [{
        id: "event-1",
        date: String(eventDate),
        before: { status: "FINANCE VALIDATION" },
        after: { status: "FINANCE PROCESSING" },
        user: { username: "Finance User" },
      }],
    }),
  }) as never;
}

describe("ClickUp status webhook timestamp persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.CLICKUP_WEBHOOK_SECRET;
    vi.mocked(readFormDestinationFromSupabase).mockResolvedValue({
      enabled: true,
      listId: "list-1",
      workspaceId: "workspace-1",
    } as never);
    vi.mocked(readPortalSettingsFromSupabase).mockResolvedValue({
      clickupFieldMapping: {
        "RFP TS - Finance Processing": "finance-processing-field",
      },
    } as never);
    vi.mocked(readWorkflowStatusesFromSupabase).mockResolvedValue({
      financeProcessing: "FINANCE PROCESSING",
    } as never);
    vi.mocked(getClickUpConfig).mockReturnValue({
      token: "pk_server_token",
      listId: "list-1",
      isConfigured: true,
      isOAuth: false,
    });
    vi.mocked(getClickUpTask).mockResolvedValue({
      id: "task-1",
      date_created: "1789610000000",
      custom_fields: [{ id: "finance-processing-field", name: "Renamed field", type: "date", value: null }],
    });
  });

  it("uses the Supabase field mapping and server token for Finance Processing", async () => {
    vi.mocked(setTaskCustomFieldValue).mockResolvedValue(true);

    const response = await POST(webhookRequest());

    expect(response.status).toBe(200);
    expect(setTaskCustomFieldValue).toHaveBeenCalledWith(
      "task-1",
      "finance-processing-field",
      eventDate,
      "pk_server_token"
    );
  });

  it("returns an error when ClickUp rejects the authoritative timestamp write", async () => {
    vi.mocked(setTaskCustomFieldValue).mockResolvedValue(false);

    const response = await POST(webhookRequest());
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/Finance Processing/i);
  });
});
