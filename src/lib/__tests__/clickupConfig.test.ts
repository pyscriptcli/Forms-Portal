import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { approveTaskByApprover, buildTaskDescription, createClickUpTask, getClickUpConfig } from "@/lib/clickup";

describe("ClickUp Configuration Multi-List Resolution", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.unstubAllGlobals();
  });

  it("resolves RFP_LIST_ID when configured for RFP form", () => {
    process.env.CLICKUP_API_TOKEN = "pk_test_token_123";
    process.env.RFP_LIST_ID = "999888777111";
    process.env.CLICKUP_LIST_ID = "111222333444";

    const config = getClickUpConfig("rfp");
    expect(config.isConfigured).toBe(true);
    expect(config.listId).toBe("999888777111");
  });

  it("falls back to CLICKUP_LIST_ID when RFP_LIST_ID is not provided", () => {
    process.env.CLICKUP_API_TOKEN = "pk_test_token_123";
    delete process.env.RFP_LIST_ID;
    process.env.CLICKUP_LIST_ID = "111222333444";

    const config = getClickUpConfig("rfp");
    expect(config.isConfigured).toBe(true);
    expect(config.listId).toBe("111222333444");
  });

  it("uses the configured default submissions List for RFP forms", () => {
    process.env.CLICKUP_API_TOKEN = "pk_test_token_123";
    delete process.env.RFP_LIST_ID;
    delete process.env.CLICKUP_RFP_LIST_ID;
    delete process.env.CLICKUP_LIST_ID;

    const config = getClickUpConfig("rfp");
    expect(config.listId).toBe("901420772915");
  });

  it("uses the OAuth session token when one is provided", () => {
    const config = getClickUpConfig("rfp", "oauth-access-token");
    expect(config.token).toBe("oauth-access-token");
    expect(config.isOAuth).toBe(true);
    expect(config.listId).toBe("901420772915");
  });

  it("persists the portal RFP ID in the ClickUp task description", () => {
    const description = buildTaskDescription({
      rfpCodeSuffix: "RFP-092026-0042",
      requestedByEmail: "requestor@example.com",
      requestedByName: "Requestor",
      date: "09/15/2026",
      dateNeeded: "09/20/2026",
      payee: "Vendor",
      department: "ISD",
      totalAmount: 100,
      purpose: "Test",
      items: [],
      bank: "",
      accountName: "",
      accountNumber: "",
      paymentMethod: "online",
      signatureType: "none",
      requestedByRemarks: "",
      urgency: "not_urgent",
    } as any);

    expect(description).toContain("| **RFP ID** | **RFP-092026-0042** |");
    expect(description).toContain("| **Requested By Email** | requestor@example.com |");
  });

  it("does not report a mock task as a successful ClickUp submission", async () => {
    delete process.env.CLICKUP_API_TOKEN;
    await expect(
      createClickUpTask({ payee: "Test Payee", totalAmount: 100 }, "http://localhost:3000", "rfp")
    ).rejects.toThrow(/CLICKUP_API_TOKEN/);
  });

  it("normalizes the create-task payload fields that ClickUp requires as strings", async () => {
    const fetchMock = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const payload = JSON.parse(String(init?.body));
      const invalid = ["name", "description", "markdown_content", "status"]
        .find((field) => typeof payload[field] !== "string");
      if (invalid) {
        return Response.json(
          { err: "Value is not a valid string", ECODE: "FIELD_018", field: invalid },
          { status: 400 }
        );
      }
      return Response.json({ id: "task-1", url: "https://app.clickup.com/t/task-1", status: { status: payload.status } });
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(createClickUpTask(
      { payee: "Vendor", totalAmount: 100, purpose: "Supplies", items: [] },
      "http://localhost:3000",
      "rfp",
      "oauth-token",
      "list-123",
      { requestorFormSubmission: { status: "REQUESTOR FORM SUBMISSION" } } as never
    )).resolves.toMatchObject({ id: "task-1" });
  });

  it("does not advance approval when the Finance Validation timestamp field is missing", async () => {
    process.env.CLICKUP_API_TOKEN = "pk_test_token_123";
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({
        id: "task-1",
        description: "Request",
        custom_fields: [
          { id: "approver-name", name: "RFP Approver Name", type: "short_text" },
        ],
      }))
      .mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(approveTaskByApprover("task-1", "Team Lead", undefined, undefined, {
      signatureDataUrl: "data:image/png;base64,c2ln",
      approvalDate: "09/17/2026",
    })).resolves.toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(String(fetchMock.mock.calls[2][0])).toContain("/field/approver-name");
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === "PUT")).toBe(false);
  });

  it("resolves PO_LIST_ID for PO forms", () => {
    process.env.CLICKUP_API_TOKEN = "pk_test_token_123";
    process.env.PO_LIST_ID = "po_list_456";
    process.env.CLICKUP_LIST_ID = "default_list_123";

    const config = getClickUpConfig("po");
    expect(config.listId).toBe("po_list_456");
  });

  it("resolves PCV_LIST_ID for PCV forms", () => {
    process.env.CLICKUP_API_TOKEN = "pk_test_token_123";
    process.env.PCV_LIST_ID = "pcv_list_789";
    process.env.CLICKUP_LIST_ID = "default_list_123";

    const config = getClickUpConfig("pcv");
    expect(config.listId).toBe("pcv_list_789");
  });
});
