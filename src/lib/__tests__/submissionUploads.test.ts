import { afterEach, describe, expect, it, vi } from "vitest";
import { MAX_UPLOAD_FILE_BYTES, uploadSubmissionFiles } from "@/lib/submissionUploads";

afterEach(() => {
  vi.unstubAllGlobals();
  document.cookie = "clickup_auth_token=; Max-Age=0";
});

describe("split ClickUp attachment uploads", () => {
  it("uploads directly to ClickUp when the browser has an OAuth session token", async () => {
    document.cookie = "clickup_auth_token=oauth-token";
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => "" });
    vi.stubGlobal("fetch", fetchMock);
    const file = new File(["pdf"], "RFP-092026-0003_RFP_BestPrint.pdf", { type: "application/pdf" });

    await uploadSubmissionFiles("task-123", [{ key: "pdf", file }], new Set(), vi.fn());

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.clickup.com/api/v2/task/task-123/attachment");
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Bearer oauth-token");
    expect(fetchMock.mock.calls[0][1].body.get("attachment").name).toBe(file.name);
    document.cookie = "clickup_auth_token=; Max-Age=0";
  });

  it("sends one request per attachment and keeps the task ID", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ success: true }) });
    vi.stubGlobal("fetch", fetchMock);
    const entries = [
      { key: "pdf", file: new File(["pdf"], "form.pdf", { type: "application/pdf" }) },
      { key: "quote", file: new File(["quote"], "quote.png", { type: "image/png" }) },
    ];
    const completed = new Set<string>();
    await uploadSubmissionFiles("task-123", entries, completed, vi.fn());

    expect(fetchMock).toHaveBeenCalledTimes(2);
    for (const [, options] of fetchMock.mock.calls) {
      expect(options.body.get("taskId")).toBe("task-123");
      expect(options.body.getAll("file")).toHaveLength(1);
    }
    expect([...completed]).toEqual(["pdf", "quote"]);
  });

  it("retries only the file that failed without recreating or reuploading the PDF", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ success: true }) })
      .mockResolvedValueOnce({ ok: false, status: 502, json: async () => ({ success: false, message: "ClickUp unavailable" }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ success: true }) });
    vi.stubGlobal("fetch", fetchMock);
    const entries = [
      { key: "pdf", file: new File(["pdf"], "form.pdf") },
      { key: "quote", file: new File(["quote"], "quote.png") },
    ];
    const completed = new Set<string>();
    await expect(uploadSubmissionFiles("task-123", entries, completed, vi.fn())).rejects.toThrow("ClickUp unavailable");
    expect([...completed]).toEqual(["pdf"]);

    await uploadSubmissionFiles("task-123", entries, completed, vi.fn());
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[2][1].body.get("file").name).toBe("quote.png");
  });

  it("rejects an oversized file before sending any request", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const file = new File([new Uint8Array(MAX_UPLOAD_FILE_BYTES + 1)], "large.pdf");
    await expect(uploadSubmissionFiles("task-123", [{ key: "large", file }], new Set(), vi.fn()))
      .rejects.toThrow("large.pdf exceeds the 50 MB");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("stages a large file in Supabase before relaying it to ClickUp", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true, signedUrl: "https://storage.test/upload", token: "signed-token", path: "staging/file.pdf" }),
      })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ success: true }) });
    vi.stubGlobal("fetch", fetchMock);
    const file = new File([new Uint8Array(5 * 1024 * 1024)], "large.pdf", { type: "application/pdf" });
    await uploadSubmissionFiles("task-123", [{ key: "large", file }], new Set(), vi.fn());

    expect(fetchMock.mock.calls[0][0]).toBe("/api/rfp/upload-sign");
    expect(fetchMock.mock.calls[1][1].method).toBe("PUT");
    expect(fetchMock.mock.calls[1][0].toString()).toContain("token=signed-token");
    expect(fetchMock.mock.calls[2][0]).toBe("/api/rfp/relay-attachment");
  });
});
