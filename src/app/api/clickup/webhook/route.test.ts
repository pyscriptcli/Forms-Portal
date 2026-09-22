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

describe("ClickUp status webhook audit persistence", () => {
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
        "RFP Process History": "history-field-id",
        "RFP Last Status Event ID": "event-field-id",
        "TS RFP - Finance Processing": "finance-processing-ts-field-id",
        "BY RFP - Finance Processing": "finance-processing-by-field-id",
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
      custom_fields: [
        { id: "history-field-id", name: "RFP Process History", type: "text", value: null },
        { id: "event-field-id", name: "RFP Last Status Event ID", type: "short_text", value: null },
        { id: "finance-processing-ts-field-id", name: "TS RFP - Finance Processing", type: "date", value: null },
        { id: "finance-processing-by-field-id", name: "BY RFP - Finance Processing", type: "short_text", value: null },
      ],
    });
  });

  it("updates process history and last status event ID for status updates", async () => {
    vi.mocked(setTaskCustomFieldValue).mockResolvedValue(true);

    const response = await POST(webhookRequest());

    expect(response.status).toBe(200);
    expect(setTaskCustomFieldValue).toHaveBeenCalledWith(
      "task-1",
      "finance-processing-ts-field-id",
      eventDate,
      "pk_server_token"
    );
    expect(setTaskCustomFieldValue).toHaveBeenCalledWith(
      "task-1",
      "history-field-id",
      expect.stringContaining("FINANCE PROCESSING"),
      "pk_server_token"
    );
    expect(setTaskCustomFieldValue).toHaveBeenCalledWith(
      "task-1",
      "finance-processing-by-field-id",
      "Finance User",
      "pk_server_token"
    );
    expect(setTaskCustomFieldValue).toHaveBeenCalledWith(
      "task-1",
      "event-field-id",
      "event-1",
      "pk_server_token"
    );
  });

  it("handles duplicate webhook events idempotently", async () => {
    vi.mocked(getClickUpTask).mockResolvedValue({
      id: "task-1",
      date_created: "1789610000000",
      custom_fields: [
        { id: "event-field-id", name: "RFP Last Status Event ID", type: "short_text", value: "event-1" },
      ],
    });

    const response = await POST(webhookRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.duplicate).toBe(true);
    expect(setTaskCustomFieldValue).not.toHaveBeenCalled();
  });

  it("does not invent a timestamp when ClickUp omits the activity date", async () => {
    const request = new Request("http://localhost/api/clickup/webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "taskStatusUpdated",
        task_id: "task-1",
        history_items: [{
          id: "event-without-date",
          before: { status: "FINANCE VALIDATION" },
          after: { status: "FINANCE PROCESSING" },
        }],
      }),
    }) as never;

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.reason).toContain("authoritative status event timestamp");
    expect(setTaskCustomFieldValue).not.toHaveBeenCalled();
  });
});
