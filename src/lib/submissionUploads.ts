export const MAX_UPLOAD_FILE_BYTES = 4 * 1024 * 1024;

export interface UploadEntry {
  key: string;
  file: File;
}

export function assertUploadSizes(entries: UploadEntry[]) {
  const oversized = entries.find(({ file }) => file.size > MAX_UPLOAD_FILE_BYTES);
  if (oversized) {
    throw new Error(`${oversized.file.name} exceeds the 4 MB per-file upload limit.`);
  }
}

export async function uploadSubmissionFiles(
  taskId: string,
  entries: UploadEntry[],
  completed: Set<string>,
  onUploaded: (key: string) => void
) {
  assertUploadSizes(entries);
  for (const { key, file } of entries) {
    if (completed.has(key)) continue;
    const body = new FormData();
    body.append("taskId", taskId);
    body.append("file", file);
    let response: Response;
    try {
      response = await fetch("/api/rfp/upload", { method: "POST", body });
    } catch {
      throw new Error(`Upload interrupted for ${file.name}. Retry to continue the existing request.`);
    }
    const result = await response.json().catch(() => null);
    if (!response.ok || !result?.success) {
      const message = response.status === 413
        ? `${file.name} exceeds the server upload limit.`
        : result?.message || `Upload failed for ${file.name}. Retry to continue the existing request.`;
      throw new Error(message);
    }
    completed.add(key);
    onUploaded(key);
  }
}
