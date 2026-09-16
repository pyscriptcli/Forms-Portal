import { NextRequest, NextResponse } from "next/server";
import { fetchClickUpUser, getServerAuthSession } from "@/lib/auth";
import { getClickUpTask, taskHasAttachmentNamed, uploadAttachmentToTask } from "@/lib/clickup";
import { downloadStagedFile, removeStagedFile } from "@/lib/supabaseStorage";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { accessToken } = await getServerAuthSession();
  if (!accessToken) return NextResponse.json({ success: false, message: "Sign in with ClickUp before uploading." }, { status: 401 });
  let objectPath = "";
  try {
    const user = await fetchClickUpUser(accessToken);
    const body = await req.json() as { taskId?: string; path?: string; filename?: string };
    const taskId = String(body.taskId || "").trim();
    objectPath = String(body.path || "").trim();
    const filename = String(body.filename || "attachment");
    if (!taskId || !objectPath.startsWith("staging/") || objectPath.includes("..") || objectPath.includes("\\")) return NextResponse.json({ success: false, message: "Invalid staged attachment request." }, { status: 400 });
    const task = await getClickUpTask(taskId, accessToken);
    if (!task) return NextResponse.json({ success: false, message: "Request not found in ClickUp." }, { status: 404 });
    const description = task.markdown_description || task.description || "";
    const emailMatch = description.match(/\|\s*\*\*Requested By Email\*\*\s*\|\s*([^|\n]+)\|/i);
    const taskEmail = emailMatch?.[1]?.replace(/[\*_`]/g, "").trim().toLowerCase();
    const creatorId = String(task.creator?.id || "");
    if (taskEmail ? taskEmail !== user.email.toLowerCase() : creatorId !== String(user.id)) return NextResponse.json({ success: false, message: "You cannot upload to this request." }, { status: 403 });
    if (/[\\/:*?"<>|]/.test(filename)) return NextResponse.json({ success: false, message: "The upload filename contains unsupported characters." }, { status: 400 });
    if (taskHasAttachmentNamed(task, filename)) return NextResponse.json({ success: true, alreadyExists: true });
    const file = await downloadStagedFile(objectPath);
    const result = await uploadAttachmentToTask(taskId, file, filename, accessToken);
    if (!result.success) return NextResponse.json({ success: false, message: `ClickUp could not save ${filename}.` }, { status: 502 });
    return NextResponse.json({ success: true, attachmentId: result.id, url: result.url });
  } catch (error: any) {
    console.error("Error relaying staged attachment:", error);
    return NextResponse.json({ success: false, message: error.message || "Large-file relay failed." }, { status: 500 });
  } finally {
    if (objectPath) await removeStagedFile(objectPath).catch(() => undefined);
  }
}
