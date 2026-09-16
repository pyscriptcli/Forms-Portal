export const MAX_DIRECT_UPLOAD_FILE_BYTES = 4 * 1024 * 1024;
export const MAX_UPLOAD_FILE_BYTES = MAX_DIRECT_UPLOAD_FILE_BYTES;

export interface UploadEntry {
  key: string;
  file: File;
}

export function assertUploadSizes(entries: UploadEntry[]) {
  const oversized = entries.find(({ file }) => file.size > MAX_UPLOAD_FILE_BYTES);
  if (oversized) {
    throw new Error(`${oversized.file.name} exceeds the 4 MB per-file upload limit and cannot be attached.`);
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
  const body = new FormData();
  body.append("taskId", taskId);
  body.append("file", file);
  return parseUploadResponse(await fetchUploadEndpoint("/api/rfp/upload", { method: "POST", body }, file.name), file.name);
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
