import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  getServerAuthSession: vi.fn(),
}));

vi.mock("@/lib/supabaseAdmin", () => ({
  readNextRfpReference: vi.fn(),
}));

import { GET } from "./route";
import { getServerAuthSession } from "@/lib/auth";
import { readNextRfpReference } from "@/lib/supabaseAdmin";

describe("GET /api/rfp/next-reference", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-16T09:00:00+08:00"));
    vi.mocked(getServerAuthSession).mockResolvedValue({ accessToken: "oauth-token", user: null });
    vi.mocked(readNextRfpReference).mockResolvedValue({ reference: "RFP-092026-0012", lastSequence: 11 });
  });

  afterEach(() => vi.useRealTimers());

  it("previews the next reserved Finance sequence without scanning ClickUp", async () => {
    const response = await GET();
    const body = await response.json();

    expect(body).toMatchObject({ success: true, reference: "RFP-092026-0012", lastSequence: 11, source: "finance-ledger" });
    expect(readNextRfpReference).toHaveBeenCalledWith("092026");
  });
});
