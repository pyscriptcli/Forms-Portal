import { NextRequest, NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { getClickUpTask } from "@/lib/clickup";
import { resolveUserAccess } from "@/lib/rbacServer";

// ClickUp attachment URLs are relayed through the portal so approvers never
// need to open the ClickUp task directly. The user's ClickUp session remains
// server-side and the browser only receives the file response.
export async function GET(req: NextRequest) {
  const { accessToken, user } = await getServerAuthSession();
  if (!accessToken || !user) return NextResponse.json({ message: "Sign in required." }, { status: 401 });
  const access = await resolveUserAccess(user);
  if (!access.permissions.includes("approvals") && !access.permissions.includes("settings")) {
    return NextResponse.json({ message: "Approval access is required." }, { status: 403 });
  }

  const params = new URL(req.url).searchParams;
  const taskId = params.get("taskId") || "";
  const attachmentId = params.get("attachmentId") || "";
  const attachmentName = params.get("name") || "";
  if (!taskId || (!attachmentId && !attachmentName)) return NextResponse.json({ message: "Attachment reference is required." }, { status: 400 });

  const task = await getClickUpTask(taskId, accessToken);
  const attachment = Array.isArray(task?.attachments) ? task.attachments.find((item: any) =>
    (attachmentId && String(item?.id || "") === attachmentId) || (!attachmentId && String(item?.name || item?.title || "") === attachmentName)
  ) : null;
  const rawUrl = String(attachment?.url || attachment?.thumbnail_large || "");
  if (!rawUrl) return NextResponse.json({ message: "Attachment not found." }, { status: 404 });

  let attachmentUrl: URL;
  try {
    attachmentUrl = new URL(rawUrl);
  } catch {
    return NextResponse.json({ message: "Invalid attachment URL." }, { status: 400 });
  }
  if (attachmentUrl.protocol !== "https:" || !/(^|\.)clickup(?:usercontent)?\.com$/i.test(attachmentUrl.hostname)) {
    return NextResponse.json({ message: "Attachment host is not allowed." }, { status: 400 });
  }

  const upstream = await fetch(attachmentUrl, {
    headers: { Authorization: accessToken },
    cache: "no-store",
  });
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ message: "Unable to retrieve the attachment." }, { status: upstream.status || 502 });
  }

  const headers = new Headers();
  headers.set("Content-Type", upstream.headers.get("content-type") || "application/octet-stream");
  headers.set("Content-Disposition", "inline");
  headers.set("Cache-Control", "private, no-store");
  return new NextResponse(upstream.body, { status: 200, headers });
}
