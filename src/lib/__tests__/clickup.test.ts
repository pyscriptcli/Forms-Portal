import { afterEach, describe, expect, it, vi } from "vitest";
import { uploadAttachmentToTask } from "@/lib/clickup";

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
});
