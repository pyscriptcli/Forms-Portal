import type { TrackedRfp } from "./rfpTrackerMapping";

export interface RfpCacheEntry {
  requests: TrackedRfp[];
  fetchedAt: string;
  expiresAt: number;
  workspaceId: string;
  listId: string;
}

export interface RfpQueueReadResult {
  requests: TrackedRfp[];
  fetchedAt: string;
  isStale: boolean;
  source: "clickup" | "cache";
  warning?: string;
}

const CACHE_TTL_MS = 15_000; // 15 seconds freshness window

const cacheStore = new Map<string, RfpCacheEntry>();
const inFlightPromises = new Map<string, Promise<TrackedRfp[]>>();

export function getRfpCacheKey(workspaceId: string, listId: string): string {
  return `${workspaceId.trim()}:${listId.trim()}`;
}

export function getRfpCacheEntry(workspaceId: string, listId: string): RfpCacheEntry | undefined {
  return cacheStore.get(getRfpCacheKey(workspaceId, listId));
}

/**
 * Invalidates the cache entry for a given workspace/list or all if omitted.
 */
export function invalidateRfpCache(workspaceId?: string, listId?: string): void {
  if (workspaceId && listId) {
    const key = getRfpCacheKey(workspaceId, listId);
    cacheStore.delete(key);
    inFlightPromises.delete(key);
  } else if (listId) {
    for (const key of Array.from(cacheStore.keys())) {
      if (key.endsWith(`:${listId.trim()}`)) {
        cacheStore.delete(key);
        inFlightPromises.delete(key);
      }
    }
  } else {
    cacheStore.clear();
    inFlightPromises.clear();
  }
}

/**
 * Executes a read-through cache lookup or initiates a deduplicated fetch to ClickUp.
 */
export async function getRfpQueueFromCacheOrFetch(options: {
  workspaceId: string;
  listId: string;
  forceRefresh?: boolean;
  fetcher: () => Promise<TrackedRfp[]>;
}): Promise<RfpQueueReadResult> {
  const { workspaceId, listId, forceRefresh = false, fetcher } = options;
  const key = getRfpCacheKey(workspaceId, listId);
  const now = Date.now();
  const existing = cacheStore.get(key);

  // 1. Fresh cache hit (bypassed if forceRefresh is true)
  if (!forceRefresh && existing && now < existing.expiresAt) {
    return {
      requests: existing.requests,
      fetchedAt: existing.fetchedAt,
      isStale: false,
      source: "cache",
    };
  }

  // 2. In-flight request deduplication
  let inFlight = inFlightPromises.get(key);
  let isOriginator = false;

  if (!inFlight) {
    isOriginator = true;
    inFlight = (async () => {
      try {
        const freshRequests = await fetcher();
        if (!Array.isArray(freshRequests)) {
          throw new Error("ClickUp API returned an invalid response structure.");
        }
        const writeTime = Date.now();
        const entry: RfpCacheEntry = {
          requests: freshRequests,
          fetchedAt: new Date(writeTime).toISOString(),
          expiresAt: writeTime + CACHE_TTL_MS,
          workspaceId,
          listId,
        };
        cacheStore.set(key, entry);
        return freshRequests;
      } finally {
        inFlightPromises.delete(key);
      }
    })();
    inFlightPromises.set(key, inFlight);
  }

  try {
    const requests = await inFlight;
    const entry = cacheStore.get(key);
    return {
      requests,
      fetchedAt: entry?.fetchedAt || new Date().toISOString(),
      isStale: false,
      source: isOriginator ? "clickup" : "cache",
    };
  } catch (err: any) {
    // 3. ClickUp failed: if we have an older entry, return it as stale with a warning
    if (existing) {
      console.warn(`ClickUp fetch failed for ${key}, falling back to stale cache:`, err.message);
      return {
        requests: existing.requests,
        fetchedAt: existing.fetchedAt,
        isStale: true,
        source: "cache",
        warning: `Unable to refresh from ClickUp: ${err.message || "Request failed"}. Showing cached data.`,
      };
    }
    // If no cache entry exists, rethrow error - do not return false empty queue
    throw err;
  }
}

/**
 * Searches the cached list for an individual taskId, avoiding full list re-fetches.
 */
export function findTaskInRfpCache(taskId: string, workspaceId?: string, listId?: string): TrackedRfp | null {
  if (workspaceId && listId) {
    const entry = getRfpCacheEntry(workspaceId, listId);
    return entry?.requests.find((r) => r.taskId === taskId) || null;
  }
  for (const entry of Array.from(cacheStore.values())) {
    const found = entry.requests.find((r) => r.taskId === taskId);
    if (found) return found;
  }
  return null;
}
