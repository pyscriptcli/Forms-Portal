const STAGING_BUCKET = "staging-attachments";
const STAGING_PREFIX = "staging/";
const MAX_STAGING_FILE_BYTES = 50 * 1024 * 1024;

function getStorageConfig() {
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !key) throw new Error("Supabase service-role storage is not configured.");
  return { url, key };
}

function headers(key: string, extra: Record<string, string> = {}) {
  return { apikey: key, Authorization: `Bearer ${key}`, ...extra };
}

async function storageRequest(path: string, init: RequestInit = {}) {
  const { url, key } = getStorageConfig();
  return fetch(`${url}/storage/v1${path}`, {
    ...init,
    headers: headers(key, { "Content-Type": "application/json", ...(init.headers as Record<string, string> || {}) }),
  });
}

export async function ensureStagingBucket() {
  const existing = await storageRequest(`/bucket/${STAGING_BUCKET}`);
  if (existing.ok) return;
  const create = await storageRequest("/bucket", {
    method: "POST",
    body: JSON.stringify({ id: STAGING_BUCKET, name: STAGING_BUCKET, public: false, file_size_limit: MAX_STAGING_FILE_BYTES, allowed_mime_types: ["application/pdf", "image/png", "image/jpeg", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/msword"] }),
  });
  if (!create.ok && create.status !== 409) throw new Error(`Supabase staging bucket setup failed (${create.status}).`);
}

export async function createStagingUpload(filename: string) {
  await ensureStagingBucket();
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-160) || "attachment";
  const objectPath = `${STAGING_PREFIX}${Date.now()}_${crypto.randomUUID()}_${safeName}`;
  const response = await storageRequest(`/object/upload/sign/${STAGING_BUCKET}/${objectPath}`, { method: "POST", body: JSON.stringify({ expiresIn: 3600 }) });
  if (!response.ok) throw new Error(`Supabase signed upload creation failed (${response.status}).`);
  const data = await response.json() as { url?: string; token?: string; path?: string };
  if (!data.url || !data.token) throw new Error("Supabase did not return a signed upload URL.");
  const signedUrl = data.url.startsWith("http") ? data.url : `${getStorageConfig().url}/storage/v1${data.url.startsWith("/") ? data.url : `/${data.url}`}`;
  return { signedUrl, token: data.token, path: data.path || objectPath };
}

export async function downloadStagedFile(objectPath: string) {
  const response = await storageRequest(`/object/${STAGING_BUCKET}/${objectPath}`);
  if (!response.ok) throw new Error(`Supabase staging download failed (${response.status}).`);
  return response.blob();
}

export async function removeStagedFile(objectPath: string) {
  await storageRequest(`/object/${STAGING_BUCKET}`, { method: "DELETE", body: JSON.stringify({ prefixes: [objectPath] }) });
}

export async function removeExpiredStagedFiles() {
  await ensureStagingBucket();
  const response = await storageRequest(`/object/list/${STAGING_BUCKET}`, { method: "POST", body: JSON.stringify({ prefix: STAGING_PREFIX, limit: 100, sortBy: { column: "created_at", order: "asc" } }) });
  if (!response.ok) return;
  const rows = await response.json() as Array<{ name?: string; created_at?: string }>;
  const cutoff = Date.now() - 2 * 60 * 60 * 1000;
  for (const row of rows) {
    if (row.name && row.created_at && new Date(row.created_at).getTime() < cutoff) {
      await removeStagedFile(row.name.startsWith(STAGING_PREFIX) ? row.name : `${STAGING_PREFIX}${row.name}`);
    }
  }
}

export { MAX_STAGING_FILE_BYTES, STAGING_BUCKET };
