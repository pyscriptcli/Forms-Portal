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

async function fetchUploadEndpoint(input: RequestInfo | URL, init: RequestInit, filename: string) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      // A failed multipart fetch can consume its body. Rebuild FormData for
      // every attempt so retries send the file bytes again reliably.
      const retryInit = { ...init };
      if (init.body instanceof FormData) {
        const body = new FormData();
        init.body.forEach((value, key) => body.append(key, value));
        retryInit.body = body;
      }
      const response = await fetch(input, retryInit);
      if (response.ok || (![408, 425, 429].includes(response.status) && response.status < 500)) return response;
      lastError = new Error(`Upload service returned ${response.status}.`);
    } catch (error) {
      lastError = error;
    }
    if (attempt < 4) await new Promise((resolve) => setTimeout(resolve, 500 * (2 ** attempt)));
  }
  const detail = lastError instanceof Error && lastError.message ? ` (${lastError.message})` : "";
  throw new Error(`Upload service could not be reached for ${filename}${detail}. Retry to continue the existing request.`, { cause: lastError });
}

async function uploadSupportingFile(file: File, taskId: string) {
  if (file.size <= MAX_DIRECT_UPLOAD_FILE_BYTES) {
    const body = new FormData();
    body.append("taskId", taskId);
    body.append("file", file);
    return parseUploadResponse(await fetchUploadEndpoint("/api/rfp/upload", { method: "POST", body }, file.name), file.name);
  }

  const signResponse = await fetchUploadEndpoint("/api/rfp/upload-sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename: file.name, mimeType: file.type, fileSize: file.size }),
  }, file.name);
  const signed = await parseUploadResponse(signResponse, file.name);
  const uploadUrl = new URL(signed.signedUrl);
  if (!uploadUrl.searchParams.has("token")) uploadUrl.searchParams.set("token", signed.token);
  const storageResponse = await fetchUploadEndpoint(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type || "application/octet-stream", "x-upsert": "false" },
    body: file,
  }, file.name);
  if (!storageResponse.ok) {
    const storageMessage = await storageResponse.text().catch(() => "");
    throw new Error("Secure staging upload failed for " + file.name + (storageMessage ? ": " + storageMessage.slice(0, 180) : "") + ". Retry to continue the existing request.");
  }

  const relayResponse = await fetchUploadEndpoint("/api/rfp/relay-attachment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ taskId, path: signed.path, filename: file.name }),
  }, file.name);
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
