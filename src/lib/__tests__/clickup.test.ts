import { afterEach, describe, expect, it, vi } from "vitest";
import { deleteClickUpTask, readNextRfpReferenceFromClickUp, uploadAttachmentToTask } from "@/lib/clickup";

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.CLICKUP_API_TOKEN;
  delete process.env.RFP_LIST_ID;
});

describe("ClickUp attachment upload", () => {
  it("treats an accepted upload with an empty response body as success", async () => {
    process.env.CLICKUP_API_TOKEN = "test-token";
    process.env.RFP_LIST_ID = "list-123";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 200 })));

    const result = await uploadAttachmentToTask(
      "task-123",
      new File(["pdf"], "RFP-092026-0003_RFP_BestPrint.pdf", { type: "application/pdf" }) as Blob,
      "RFP-092026-0003_RFP_BestPrint.pdf"
    );

    expect(result.success).toBe(true);
  });

  it("deletes an incomplete task during submission rollback", async () => {
    process.env.CLICKUP_API_TOKEN = "test-token";
    process.env.RFP_LIST_ID = "list-123";
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await deleteClickUpTask("task-123");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.clickup.com/api/v2/task/task-123",
      expect.objectContaining({ method: "DELETE" })
    );
  });

  it("derives the next RFP number from ClickUp task names only", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({
      tasks: [
        { name: "[RFP-092026-0010] PRIME – Vendor – Supplies" },
        { name: "Unrelated task" },
      ],
    }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await readNextRfpReferenceFromClickUp("092026", "oauth-token", "list-123");

    expect(result).toEqual({ reference: "RFP-092026-0011", lastSequence: 10 });
    expect(String(fetchMock.mock.calls[0][0])).toContain("subtasks=false");
  });

  it("creates a webhook on the team endpoint targeting the specified list", async () => {
    const { createClickUpWebhook } = await import("@/lib/clickup");
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({ id: "wh-123", webhook: { id: "wh-123", secret: "sec-456" } })
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await createClickUpWebhook(
      "list-123",
      "https://portal.com/api/clickup/webhook",
      "pk_test_token",
      "team-999"
    );

    expect(result.id).toBe("wh-123");
    expect(result.secret).toBe("sec-456");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.clickup.com/api/v2/team/team-999/webhook",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          endpoint: "https://portal.com/api/clickup/webhook",
          events: ["taskStatusUpdated"],
          list_id: "list-123",
        }),
      })
    );
  });
});
