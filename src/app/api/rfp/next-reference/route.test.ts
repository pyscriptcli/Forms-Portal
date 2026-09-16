import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  getServerAuthSession: vi.fn(),
}));

vi.mock("@/lib/clickup", () => ({
  readNextRfpReferenceFromClickUp: vi.fn(),
}));

vi.mock("@/lib/supabaseAdmin", () => ({
  readFormDestinationFromSupabase: vi.fn(),
}));

import { GET } from "./route";
import { getServerAuthSession } from "@/lib/auth";
import { readNextRfpReferenceFromClickUp } from "@/lib/clickup";
import { readFormDestinationFromSupabase } from "@/lib/supabaseAdmin";

describe("GET /api/rfp/next-reference", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-16T09:00:00+08:00"));
    vi.mocked(getServerAuthSession).mockResolvedValue({ accessToken: "oauth-token", user: null });
    vi.mocked(readFormDestinationFromSupabase).mockResolvedValue({ enabled: true, listId: "list-1" } as never);
    vi.mocked(readNextRfpReferenceFromClickUp).mockResolvedValue({ reference: "RFP-092026-0011", lastSequence: 10 });
  });

  afterEach(() => vi.useRealTimers());

  it("previews the next sequence from the configured ClickUp list", async () => {
    const response = await GET();
    const body = await response.json();

    expect(body).toMatchObject({ success: true, reference: "RFP-092026-0011", lastSequence: 10, source: "clickup" });
    expect(readNextRfpReferenceFromClickUp).toHaveBeenCalledWith("092026", "oauth-token", "list-1");
  });
});
