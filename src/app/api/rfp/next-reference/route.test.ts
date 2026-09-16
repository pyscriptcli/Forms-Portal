import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  getServerAuthSession: vi.fn(),
}));

vi.mock("@/lib/clickup", () => ({
  getListTasks: vi.fn(),
}));

vi.mock("@/lib/supabaseAdmin", () => ({
  readFormDestinationFromSupabase: vi.fn(),
}));

import { GET } from "./route";
import { getServerAuthSession } from "@/lib/auth";
import { getListTasks } from "@/lib/clickup";
import { readFormDestinationFromSupabase } from "@/lib/supabaseAdmin";

describe("GET /api/rfp/next-reference", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-16T09:00:00+08:00"));
    vi.mocked(getServerAuthSession).mockResolvedValue({ accessToken: "oauth-token", user: null });
    vi.mocked(readFormDestinationFromSupabase).mockResolvedValue({ enabled: true, listId: "list-1" } as never);
  });

  afterEach(() => vi.useRealTimers());

  it("increments the highest ClickUp RFP sequence and requests the lean newest-first task view", async () => {
    vi.mocked(getListTasks).mockResolvedValue([
      { name: "[RFP-092026-0042] PRIME – Vendor – Supplies" },
      { name: "[RFP-092026-0041] PRIME – Vendor – Rent" },
    ]);

    const response = await GET();
    const body = await response.json();

    expect(body).toMatchObject({ success: true, reference: "RFP-092026-0043", lastSequence: 42, source: "clickup" });
    expect(getListTasks).toHaveBeenCalledWith(true, "rfp", "oauth-token", "list-1", {
      includeMarkdownDescription: false,
      orderBy: "created",
      reverse: true,
      throwOnError: true,
    });
  });
});
