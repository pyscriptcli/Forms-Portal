import { NextRequest, NextResponse } from "next/server";
import { fetchClickUpUser, getServerAuthSession } from "@/lib/auth";
import { getClickUpTask, uploadAttachmentToTask } from "@/lib/clickup";

export const maxDuration = 60;

const MAX_FILE_BYTES = 4 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const { accessToken } = await getServerAuthSession();
  if (!accessToken) {
    return NextResponse.json({ success: false, message: "Sign in with ClickUp before uploading." }, { status: 401 });
  }

  const contentLength = Number(req.headers.get("content-length") || 0);
  if (contentLength > MAX_FILE_BYTES + 128 * 1024) {
    return NextResponse.json({ success: false, message: "This file exceeds the 4 MB upload limit." }, { status: 413 });
  }

  try {
    const user = await fetchClickUpUser(accessToken);
    const formData = await req.formData();
    const taskId = String(formData.get("taskId") || "").trim();
    const file = formData.get("file");
    if (!taskId || !(file instanceof File) || file.size === 0) {
      return NextResponse.json({ success: false, message: "A task ID and nonempty file are required." }, { status: 400 });
    }
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ success: false, message: "This file exceeds the 4 MB upload limit." }, { status: 413 });
    }

    const task = await getClickUpTask(taskId, accessToken);
    if (!task) {
      return NextResponse.json({ success: false, message: "Request not found in ClickUp." }, { status: 404 });
    }
    const description = task.markdown_description || task.description || "";
    const emailMatch = description.match(/\|\s*\*\*Requested By Email\*\*\s*\|\s*([^|\n]+)\|/i);
    const taskEmail = emailMatch?.[1]?.replace(/[\*_`]/g, "").trim().toLowerCase();
    const creatorId = String(task.creator?.id || "");
    if (taskEmail ? taskEmail !== user.email.toLowerCase() : creatorId !== String(user.id)) {
      return NextResponse.json({ success: false, message: "You cannot upload to this request." }, { status: 403 });
    }

    const result = await uploadAttachmentToTask(taskId, file, file.name, accessToken);
    if (!result.success) {
      return NextResponse.json({ success: false, message: `ClickUp could not save ${file.name}. Retry the upload.` }, { status: 502 });
    }
    return NextResponse.json({ success: true, attachmentId: result.id, url: result.url });
  } catch (error) {
    console.error("Error uploading request attachment:", error);
    return NextResponse.json({ success: false, message: "Attachment upload failed. Retry the upload." }, { status: 500 });
  }
}
