import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getRfpQueueFromCacheOrFetch,
  invalidateRfpCache,
  findTaskInRfpCache,
} from "../rfpCache";
import type { TrackedRfp } from "../rfpTrackerMapping";

const sampleTask = (id: string): TrackedRfp => ({
  taskId: id,
  requestId: `RFP-${id}`,
  taskName: `Task ${id}`,
  formType: "rfp",
  payee: "Acme",
  department: "IT",
  totalAmount: 5000,
  dateNeeded: "2026-09-20",
  urgency: "normal",
  purpose: "Supplies",
  requestedBy: "Alice",
  approverName: "Bob",
  currentStage: "submitted",
  stageLabel: "Submission",
  currentMilestone: "Requestor Form Submission",
  stageIndex: 0,
  isRevisionRequested: false,
  dateCreated: "2026-09-16T08:00:00.000Z",
  attachments: [],
  milestoneTimestamps: {},
});

describe("rfpCache", () => {
  beforeEach(() => {
    invalidateRfpCache();
    vi.useRealTimers();
  });

  it("calls fetcher on initial cold load and returns source: clickup", async () => {
    const fetcher = vi.fn().mockResolvedValue([sampleTask("1")]);
    const result = await getRfpQueueFromCacheOrFetch({
      workspaceId: "ws-1",
      listId: "list-1",
      fetcher,
    });

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(result.source).toBe("clickup");
    expect(result.isStale).toBe(false);
    expect(result.requests).toHaveLength(1);
  });

  it("fresh cache hit within 15 seconds makes zero fetcher calls and returns source: cache", async () => {
    const fetcher = vi.fn().mockResolvedValue([sampleTask("1")]);
    await getRfpQueueFromCacheOrFetch({
      workspaceId: "ws-1",
      listId: "list-1",
      fetcher,
    });

    const secondResult = await getRfpQueueFromCacheOrFetch({
      workspaceId: "ws-1",
      listId: "list-1",
      fetcher,
    });

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(secondResult.source).toBe("cache");
    expect(secondResult.isStale).toBe(false);
  });

  it("forceRefresh=true bypasses fresh cache and calls fetcher", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce([sampleTask("1")])
      .mockResolvedValueOnce([sampleTask("1"), sampleTask("2")]);

    await getRfpQueueFromCacheOrFetch({ workspaceId: "ws-1", listId: "list-1", fetcher });

    const refreshed = await getRfpQueueFromCacheOrFetch({
      workspaceId: "ws-1",
      listId: "list-1",
      forceRefresh: true,
      fetcher,
    });

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(refreshed.source).toBe("clickup");
    expect(refreshed.requests).toHaveLength(2);
  });

  it("concurrent calls share one in-flight promise", async () => {
    let resolvePromise!: (val: TrackedRfp[]) => void;
    const slowFetcher = vi.fn().mockReturnValue(
      new Promise((resolve) => {
        resolvePromise = resolve;
      })
    );

    const call1 = getRfpQueueFromCacheOrFetch({ workspaceId: "ws-1", listId: "list-1", fetcher: slowFetcher });
    const call2 = getRfpQueueFromCacheOrFetch({ workspaceId: "ws-1", listId: "list-1", fetcher: slowFetcher });

    expect(slowFetcher).toHaveBeenCalledTimes(1);

    resolvePromise([sampleTask("1")]);
    const [res1, res2] = await Promise.all([call1, call2]);

    expect(res1.requests).toHaveLength(1);
    expect(res2.requests).toHaveLength(1);
    expect(res1.source).toBe("clickup");
    expect(res2.source).toBe("cache");
  });

  it("returns stale cache with isStale: true when ClickUp fails and previous cache exists", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce([sampleTask("1")]);
    await getRfpQueueFromCacheOrFetch({ workspaceId: "ws-1", listId: "list-1", fetcher });

    // Next fetch fails
    const failingFetcher = vi.fn().mockRejectedValue(new Error("ClickUp 503 Rate Limit"));
    const staleResult = await getRfpQueueFromCacheOrFetch({
      workspaceId: "ws-1",
      listId: "list-1",
      forceRefresh: true,
      fetcher: failingFetcher,
    });

    expect(staleResult.isStale).toBe(true);
    expect(staleResult.source).toBe("cache");
    expect(staleResult.requests).toHaveLength(1);
    expect(staleResult.warning).toContain("ClickUp 503 Rate Limit");
  });

  it("throws error and does not return empty array if initial cold fetch fails", async () => {
    const failingFetcher = vi.fn().mockRejectedValue(new Error("Network Down"));

    await expect(
      getRfpQueueFromCacheOrFetch({ workspaceId: "ws-new", listId: "list-new", fetcher: failingFetcher })
    ).rejects.toThrow("Network Down");
  });

  it("findTaskInRfpCache locates task without API calls", async () => {
    const fetcher = vi.fn().mockResolvedValue([sampleTask("task-99")]);
    await getRfpQueueFromCacheOrFetch({ workspaceId: "ws-1", listId: "list-1", fetcher });

    const found = findTaskInRfpCache("task-99", "ws-1", "list-1");
    expect(found).not.toBeNull();
    expect(found?.taskId).toBe("task-99");

    const notFound = findTaskInRfpCache("task-non-existent", "ws-1", "list-1");
    expect(notFound).toBeNull();
  });

  it("invalidates cache when invalidateRfpCache is called", async () => {
    const fetcher = vi.fn().mockResolvedValue([sampleTask("1")]);
    await getRfpQueueFromCacheOrFetch({ workspaceId: "ws-1", listId: "list-1", fetcher });

    invalidateRfpCache("ws-1", "list-1");

    await getRfpQueueFromCacheOrFetch({ workspaceId: "ws-1", listId: "list-1", fetcher });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
