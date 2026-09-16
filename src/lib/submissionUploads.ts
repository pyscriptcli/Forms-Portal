export const MAX_DIRECT_UPLOAD_FILE_BYTES = 4 * 1024 * 1024;
export const MAX_UPLOAD_FILE_BYTES = 50 * 1024 * 1024;
const CLICKUP_API_BASE = "https://api.clickup.com/api/v2";

export interface UploadEntry {
  key: string;
  file: File;
}

export function assertUploadSizes(entries: UploadEntry[]) {
  const oversized = entries.find(({ file }) => file.size > MAX_UPLOAD_FILE_BYTES);
  if (oversized) {
    throw new Error(`${oversized.file.name} exceeds the 50 MB per-file upload limit.`);
  }
}

async function parseUploadResponse(response: Response, filename: string) {
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.success) {
    const message = response.status === 413
      ? `${filename} exceeds the server upload limit.`
      : result?.message || `Upload failed for ${filename}. Retry to continue the existing request.`;
    throw new Error(message);
  }
  return result;
}

async function uploadSupportingFile(file: File, taskId: string) {
  const clientToken = typeof document !== "undefined"
    ? document.cookie.match(/(?:^|; )clickup_auth_token=([^;]+)/)?.[1]
    : undefined;

  // Internal-tool direct mode: send the file from the browser to ClickUp.
  // No Vercel upload endpoint or Supabase staging is involved when the OAuth
  // token is available in the browser session.
  if (clientToken) {
    try {
      const body = new FormData();
      body.append("attachment", file, file.name);
      const response = await fetch(`${CLICKUP_API_BASE}/task/${encodeURIComponent(taskId)}/attachment`, {
        method: "POST",
        headers: { Authorization: `Bearer ${decodeURIComponent(clientToken)}` },
        body,
      });
      const result = await response.text().catch(() => "");
      if (!response.ok) {
        let message = result;
        try { message = JSON.parse(result)?.err || JSON.parse(result)?.message || result; } catch { /* plain text response */ }
        throw new Error(`ClickUp direct upload failed for ${file.name} (${response.status})${message ? `: ${message.slice(0, 240)}` : "."}`);
      }
      return { success: true };
    } catch (error) {
      // ClickUp does not expose this endpoint to browser origins in all
      // workspaces. A CORS/network TypeError means the request never produced
      // a readable response; use the authenticated relay, which also checks
      // for an already-created same-name attachment before retrying.
      const message = error instanceof Error ? error.message : "";
      if (!(error instanceof TypeError) && !/failed to fetch|load failed/i.test(message)) throw error;
      console.warn("Direct ClickUp upload unavailable; using authenticated relay.");
    }
  }

  if (file.size <= MAX_DIRECT_UPLOAD_FILE_BYTES) {
    const body = new FormData();
    body.append("taskId", taskId);
    body.append("file", file);
    return parseUploadResponse(await fetch("/api/rfp/upload", { method: "POST", body }), file.name);
  }

  const signResponse = await fetch("/api/rfp/upload-sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename: file.name, mimeType: file.type, fileSize: file.size }),
  });
  const signed = await parseUploadResponse(signResponse, file.name);
  const uploadUrl = new URL(signed.signedUrl);
  if (!uploadUrl.searchParams.has("token")) uploadUrl.searchParams.set("token", signed.token);
  const storageResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type || "application/octet-stream", "x-upsert": "false" },
    body: file,
  });
  if (!storageResponse.ok) {
    const storageMessage = await storageResponse.text().catch(() => "");
    throw new Error("Secure staging upload failed for " + file.name + (storageMessage ? ": " + storageMessage.slice(0, 180) : "") + ". Retry to continue the existing request.");
  }

  const relayResponse = await fetch("/api/rfp/relay-attachment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ taskId, path: signed.path, filename: file.name }),
  });
  return parseUploadResponse(relayResponse, file.name);
}

export async function uploadSubmissionFiles(
  taskId: string,
  entries: UploadEntry[],
  completed: Set<string>,
  onUploaded: (key: string) => void
) {
  assertUploadSizes(entries);
  const pending = entries.filter(({ key }) => !completed.has(key));
  let nextIndex = 0;
  const worker = async () => {
    while (nextIndex < pending.length) {
      const entry = pending[nextIndex++];
      try {
        await uploadSupportingFile(entry.file, taskId);
      } catch (error) {
        if (error instanceof Error && error.message) throw error;
        throw new Error(`Upload interrupted for ${entry.file.name}. Retry to continue the existing request.`);
      }
      completed.add(entry.key);
      onUploaded(entry.key);
    }
  };
  await Promise.all(Array.from({ length: Math.min(3, pending.length) }, worker));
}
