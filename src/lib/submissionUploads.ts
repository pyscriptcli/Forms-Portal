export const MAX_DIRECT_UPLOAD_FILE_BYTES = 4 * 1024 * 1024;
export const MAX_UPLOAD_FILE_BYTES = 50 * 1024 * 1024;

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
  const uploadUrl = `${signed.signedUrl}${signed.signedUrl.includes("?") ? "&" : "?"}token=${encodeURIComponent(signed.token)}`;
  const storageResponse = await fetch(uploadUrl, {
    method: "POST",
    headers: { "Content-Type": file.type || "application/octet-stream", "x-upsert": "false" },
    body: file,
  });
  if (!storageResponse.ok) {
    throw new Error(`Secure staging upload failed for ${file.name}. Retry to continue the existing request.`);
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
