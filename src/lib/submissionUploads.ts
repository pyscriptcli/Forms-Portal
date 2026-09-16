export const MAX_SUBMISSION_PAYLOAD_BYTES = 4 * 1024 * 1024;
export const MAX_DIRECT_UPLOAD_FILE_BYTES = MAX_SUBMISSION_PAYLOAD_BYTES;
export const MAX_UPLOAD_FILE_BYTES = MAX_SUBMISSION_PAYLOAD_BYTES;

export function getSubmissionPayloadSize(dataPayload: string, files: Array<Blob | File>) {
  return new TextEncoder().encode(dataPayload).byteLength
    + files.reduce((total, file) => total + file.size, 0);
}

export function assertSubmissionPayloadSize(dataPayload: string, files: Array<Blob | File>) {
  if (getSubmissionPayloadSize(dataPayload, files) > MAX_SUBMISSION_PAYLOAD_BYTES) {
    throw new Error("The complete submission exceeds the 4 MB limit. Remove attachments or use smaller files.");
  }
}
