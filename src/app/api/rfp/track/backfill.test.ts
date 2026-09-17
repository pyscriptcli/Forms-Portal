import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/clickup", () => ({
  backfillMilestoneTimestampsToClickUp: vi.fn(),
  getClickUpConfig: vi.fn(),
  getListTasks: vi.fn(),
  getClickUpTask: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ getServerAuthSession: vi.fn() }));
vi.mock("@/lib/supabaseAdmin", () => ({
  readFormDestinationFromSupabase: vi.fn(),
  readPortalSettingsFromSupabase: vi.fn(),
  readWorkflowStatusesFromSupabase: vi.fn(),
  readRbacUsersFromSupabase: vi.fn(),
}));

import { persistPendingBackfills } from "./route";
import { backfillMilestoneTimestampsToClickUp } from "@/lib/clickup";

describe("ClickUp milestone backfill", () => {
  beforeEach(() => vi.clearAllMocks());

  it("waits for mapped timestamp fields to be saved before returning portal data", async () => {
    let release!: (value: boolean) => void;
    vi.mocked(backfillMilestoneTimestampsToClickUp).mockReturnValue(
      new Promise((resolve) => { release = resolve; })
    );

    let completed = false;
    const pending = persistPendingBackfills([{
      taskId: "task-1",
      pendingClickUpBackfill: [{ fieldId: "field-1", timestamp: 1789616700000 }],
    } as never], "pk_test").then(() => { completed = true; });

    await Promise.resolve();
    expect(completed).toBe(false);

    release(true);
    await pending;
    expect(completed).toBe(true);
  });

  it("reports a failed repair without hiding otherwise valid ClickUp requests", async () => {
    vi.mocked(backfillMilestoneTimestampsToClickUp).mockResolvedValue(false);

    await expect(persistPendingBackfills([{
      taskId: "task-1",
      pendingClickUpBackfill: [{ fieldId: "field-1", timestamp: 1789616700000 }],
    } as never], "pk_test")).resolves.toEqual(["task-1"]);
  });
});
