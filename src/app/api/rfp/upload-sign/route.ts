import { NextRequest, NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { createStagingUpload, MAX_STAGING_FILE_BYTES, removeExpiredStagedFiles } from "@/lib/supabaseStorage";

export const maxDuration = 60;
const ALLOWED_TYPES = new Set(["application/pdf", "image/png", "image/jpeg", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/msword"]);
const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

export async function POST(req: NextRequest) {
  const { accessToken } = await getServerAuthSession();
  if (!accessToken) return NextResponse.json({ success: false, message: "Sign in with ClickUp before uploading." }, { status: 401 });
  try {
    const body = await req.json() as { filename?: string; mimeType?: string; fileSize?: number };
    const filename = String(body.filename || "attachment");
    const extension = filename.split(".").pop()?.toLowerCase() || "";
    const mimeType = String(body.mimeType || MIME_BY_EXTENSION[extension] || "application/octet-stream");
    const fileSize = Number(body.fileSize || 0);
    if (!fileSize || fileSize > MAX_STAGING_FILE_BYTES) return NextResponse.json({ success: false, message: "Files must be 50 MB or smaller." }, { status: 413 });
    if (!ALLOWED_TYPES.has(mimeType)) return NextResponse.json({ success: false, message: "This file type is not supported." }, { status: 415 });
    const upload = await createStagingUpload(filename);
    void removeExpiredStagedFiles().catch((error) => console.warn("Staged-file cleanup deferred:", error));
    return NextResponse.json({ success: true, ...upload });
  } catch (error: any) {
    console.error("Error creating staging upload:", error);
    return NextResponse.json({ success: false, message: error.message || "Could not prepare large-file upload." }, { status: 500 });
  }
}
