import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getClickUpTask, setTaskCustomFieldValue } from "@/lib/clickup";
import {
  CLICKUP_MILESTONE_FIELDS,
  CLICKUP_AUDIT_FIELDS,
  resolveFieldIdMapping,
} from "@/lib/clickupFields";
import { resolveRfpMilestone, ORDERED_MILESTONE_KEYS } from "@/lib/rfpWorkflow";
import { DEFAULT_WORKFLOW_STATUSES } from "@/lib/adminSettings";
import { getAdminSettings } from "@/lib/adminSettings";

/**
 * Verifies ClickUp HMAC SHA-256 webhook signature from X-Signature header.
 */
export function verifyClickUpWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string
): boolean {
  if (!signatureHeader || !secret) return false;
  try {
    const computed = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
    const sigBuffer = Buffer.from(signatureHeader.trim().toLowerCase(), "hex");
    const compBuffer = Buffer.from(computed.trim().toLowerCase(), "hex");
    if (sigBuffer.length !== compBuffer.length) return false;
    return crypto.timingSafeEqual(sigBuffer, compBuffer);
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const secret = process.env.CLICKUP_WEBHOOK_SECRET || "";
  const rawBody = await req.text();
  const signature = req.headers.get("x-signature") || req.headers.get("X-Signature");

  // In production, enforce webhook signature verification if secret is set
  if (secret && !verifyClickUpWebhookSignature(rawBody, signature, secret)) {
    console.warn("Unauthorized ClickUp webhook call: invalid signature");
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  // Only handle taskStatusUpdated
  if (payload.event !== "taskStatusUpdated") {
    return NextResponse.json({ success: true, ignored: true, reason: "Non-status event" });
  }

  const taskId = payload.task_id;
  if (!taskId) {
    return NextResponse.json({ error: "Missing task_id" }, { status: 400 });
  }

  // Read history item for transition details
  const historyItem = Array.isArray(payload.history_items) ? payload.history_items[0] : null;
  if (!historyItem) {
    return NextResponse.json({ success: true, ignored: true, reason: "No history items" });
  }

  const eventId = String(historyItem.id || "");
  const eventDate = Number(historyItem.date) || Date.now();
  const newStatus = historyItem.after?.status || payload.after?.status || "";
  const beforeStatus = historyItem.before?.status || payload.before?.status || "None";
  const actor = historyItem.user?.username || historyItem.user?.email || "ClickUp User";

  if (!newStatus) {
    return NextResponse.json({ success: true, ignored: true, reason: "Empty status" });
  }

  // Fetch full task to inspect existing audit fields and resolve field IDs
  let task: any;
  try {
    task = await getClickUpTask(taskId);
  } catch (err) {
    console.error(`Failed to fetch ClickUp task ${taskId} for webhook processing:`, err);
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const availableFields = Array.isArray(task.custom_fields) ? task.custom_fields : [];
  const fieldMapping = resolveFieldIdMapping(
    availableFields.map((f: any) => ({ id: f.id, name: f.name, type: f.type }))
  );

  // 1. Idempotency Guard: Check RFP Last Status Event ID
  const lastEventFieldId = fieldMapping[CLICKUP_AUDIT_FIELDS.lastStatusEventId];
  if (lastEventFieldId) {
    const existingField = availableFields.find((f: any) => f.id === lastEventFieldId);
    if (existingField?.value && String(existingField.value).trim() === eventId) {
      return NextResponse.json({ success: true, duplicate: true, eventId });
    }
  }

  // 2. Resolve Status to Milestone
  const resolved = resolveRfpMilestone(newStatus, DEFAULT_WORKFLOW_STATUSES);
  const milestoneKey = resolved.key;
  const milestoneFieldName = CLICKUP_MILESTONE_FIELDS[milestoneKey];
  const milestoneFieldId = fieldMapping[milestoneFieldName];

  // 3. Write Authoritative Milestone Timestamp (Unix ms)
  if (milestoneFieldId) {
    await setTaskCustomFieldValue(taskId, milestoneFieldId, eventDate);
  }

  // 3b. Backfill any preceding milestones that are currently empty
  const currentIdx = ORDERED_MILESTONE_KEYS.indexOf(milestoneKey);
  if (currentIdx > 0) {
    const priorKeys = ORDERED_MILESTONE_KEYS.slice(0, currentIdx);
    for (let p = 0; p < priorKeys.length; p++) {
      const pKey = priorKeys[p];
      const pFieldName = CLICKUP_MILESTONE_FIELDS[pKey];
      const pFieldId = fieldMapping[pFieldName];
      if (pFieldId) {
        const existingVal = availableFields.find((f: any) => f.id === pFieldId)?.value;
        if (!existingVal) {
          const ts = p === 0 ? (Number(task.date_created) || eventDate) : eventDate;
          await setTaskCustomFieldValue(taskId, pFieldId, ts);
        }
      }
    }
  }

  // 4. Append to Process History and Update Last Status Event ID
  const historyFieldId = fieldMapping[CLICKUP_AUDIT_FIELDS.processHistory];
  if (historyFieldId) {
    const existingHistoryField = availableFields.find((f: any) => f.id === historyFieldId);
    const prevHistory = existingHistoryField?.value || "";
    const eventTimeIso = new Date(eventDate).toISOString();
    const newEntry = `[${eventTimeIso}] ${actor}: "${beforeStatus}" -> "${newStatus}" (Event: ${eventId})`;
    const updatedHistory = prevHistory ? `${prevHistory}\n${newEntry}` : newEntry;

    await setTaskCustomFieldValue(taskId, historyFieldId, updatedHistory);
  }

  if (lastEventFieldId && eventId) {
    await setTaskCustomFieldValue(taskId, lastEventFieldId, eventId);
  }

  // 5. Special handling for revision requested
  if (newStatus.toUpperCase().includes("REVISION")) {
    const revAtId = fieldMapping[CLICKUP_AUDIT_FIELDS.revisionRequestedAt];
    const revById = fieldMapping[CLICKUP_AUDIT_FIELDS.revisionRequestedBy];
    if (revAtId) await setTaskCustomFieldValue(taskId, revAtId, eventDate);
    if (revById) await setTaskCustomFieldValue(taskId, revById, actor);
  }

  return NextResponse.json({
    success: true,
    taskId,
    milestone: milestoneKey,
    timestamp: eventDate,
    eventId,
  });
}
