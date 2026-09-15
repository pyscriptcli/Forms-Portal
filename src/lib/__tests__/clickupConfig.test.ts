import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getClickUpConfig } from "@/lib/clickup";

describe("ClickUp Configuration Multi-List Resolution", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
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
