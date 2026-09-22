import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getClickUpConfig, getClickUpTask, setTaskCustomFieldValue } from "@/lib/clickup";
import {
  CLICKUP_AUDIT_FIELDS,
  CLICKUP_MILESTONE_FIELDS,
  resolveFieldIdMapping,
} from "@/lib/clickupFields";
import { getMilestoneEntries } from "@/lib/rfpWorkflow";
import { DEFAULT_WORKFLOW_STATUSES, normalizeWorkflowStatuses } from "@/lib/adminSettings";
import {
  readFormDestinationFromSupabase,
  readPortalSettingsFromSupabase,
  readWorkflowStatusesFromSupabase,
} from "@/lib/supabaseAdmin";
import { invalidateRfpCache } from "@/lib/rfpCache";

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
  const rawBody = await req.text();
  const signature = req.headers.get("x-signature") || req.headers.get("X-Signature");

  const [destination, portalSettings, configuredStatuses] = await Promise.all([
    readFormDestinationFromSupabase("rfp"),
    readPortalSettingsFromSupabase(),
    readWorkflowStatusesFromSupabase(),
  ]);

  const secret = process.env.CLICKUP_WEBHOOK_SECRET || portalSettings?.clickupWebhookSecret || "";

  // A configured webhook secret requires a valid signature on every request.
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

  if (payload.event !== "taskStatusUpdated") {
    return NextResponse.json({ success: true, ignored: true, reason: "Non-status event" });
  }

  const configuredWebhookId = portalSettings?.clickupWebhookId?.trim();
  if (configuredWebhookId && String(payload.webhook_id || "") !== configuredWebhookId) {
    return NextResponse.json({ success: true, ignored: true, reason: "Unknown webhook" });
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
  const eventDate = Number(historyItem.date);
  if (!eventId || !Number.isFinite(eventDate) || eventDate <= 0) {
    return NextResponse.json({ success: true, ignored: true, reason: "Missing authoritative status event timestamp" });
  }
  const newStatus = historyItem.after?.status || payload.after?.status || "";
  const beforeStatus = historyItem.before?.status || payload.before?.status || "None";
  const actor = historyItem.user?.username || historyItem.user?.email || "ClickUp User";

  if (!newStatus) {
    return NextResponse.json({ success: true, ignored: true, reason: "Empty status" });
  }

  if (!destination?.enabled || !destination.listId) {
    return NextResponse.json({ success: false, error: "RFP ClickUp destination is not configured." }, { status: 500 });
  }
  const clickUp = getClickUpConfig("rfp", undefined, destination.listId);
  if (!clickUp.isConfigured) {
    return NextResponse.json({ success: false, error: "Server ClickUp token is not configured." }, { status: 500 });
  }

  // Fetch full task to inspect existing audit fields and resolve field IDs
  let task: any;
  try {
    task = await getClickUpTask(taskId, clickUp.token);
  } catch (err) {
    console.error(`Failed to fetch ClickUp task ${taskId} for webhook processing:`, err);
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const taskListId = String(task.list?.id || task.list_id || "");
  if (taskListId && taskListId !== String(destination.listId)) {
    return NextResponse.json({ success: true, ignored: true, reason: "Task is outside the configured RFP List" });
  }

  const availableFields = Array.isArray(task.custom_fields) ? task.custom_fields : [];
  const fieldMapping = {
    ...resolveFieldIdMapping(
      availableFields.map((f: any) => ({ id: f.id, name: f.name, type: f.type }))
    ),
    ...(portalSettings.clickupFieldMapping || {}),
  };

  // 1. Idempotency Guard: Check RFP Last Status Event ID
  const lastEventFieldId = fieldMapping[CLICKUP_AUDIT_FIELDS.lastStatusEventId];
  if (lastEventFieldId) {
    const existingField = availableFields.find((f: any) => f.id === lastEventFieldId);
    if (existingField?.value && String(existingField.value).trim() === eventId) {
      return NextResponse.json({ success: true, duplicate: true, eventId });
    }
  }

  // 2. Resolve Status to Milestone (case- and punctuation-insensitive)
  const normStatus = (s: string) => (s || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, " ");
  const workflowStatuses = normalizeWorkflowStatuses(configuredStatuses || DEFAULT_WORKFLOW_STATUSES);
  const entries = getMilestoneEntries(workflowStatuses);
  const matchedEntry = entries.find((entry) => normStatus(entry.status) === normStatus(newStatus));

  if (!matchedEntry) {
    console.log(`Unknown ClickUp status "${newStatus}" ignored by webhook.`);
    return NextResponse.json({ success: true, ignored: true, reason: `Unknown status "${newStatus}"` });
  }

  const milestoneKey = matchedEntry.key;

  // ClickUp activity is authoritative. Persist its exact event time to the
  // matching TS field; never substitute Date.now() or task date_updated.
  const milestoneFieldName = CLICKUP_MILESTONE_FIELDS[milestoneKey as keyof typeof CLICKUP_MILESTONE_FIELDS];
  const milestoneFieldId = milestoneFieldName ? fieldMapping[milestoneFieldName] : undefined;
  if (milestoneFieldId) {
    const timestampWritten = await setTaskCustomFieldValue(taskId, milestoneFieldId, eventDate, clickUp.token);
    if (!timestampWritten) {
      return NextResponse.json({ success: false, error: "Could not persist milestone timestamp." }, { status: 502 });
    }
  } else {
    console.warn(`No ClickUp timestamp field mapping found for milestone ${milestoneKey}.`);
  }

  // 4. Append to Process History and Update Last Status Event ID
  const historyFieldId = fieldMapping[CLICKUP_AUDIT_FIELDS.processHistory];
  if (historyFieldId) {
    const existingHistoryField = availableFields.find((f: any) => f.id === historyFieldId);
    const prevHistory = existingHistoryField?.value || "";
    const eventTimeIso = new Date(eventDate).toISOString();
    const newEntry = `[${eventTimeIso}] ${actor}: "${beforeStatus}" -> "${newStatus}" (Event: ${eventId})`;
    const updatedHistory = prevHistory ? `${prevHistory}\n${newEntry}` : newEntry;

    await setTaskCustomFieldValue(taskId, historyFieldId, updatedHistory, clickUp.token);
  }

  if (lastEventFieldId && eventId) {
    await setTaskCustomFieldValue(taskId, lastEventFieldId, eventId, clickUp.token);
  }

  // 5. Special handling for revision requested
  if (newStatus.toUpperCase().includes("REVISION")) {
    const revAtId = fieldMapping[CLICKUP_AUDIT_FIELDS.revisionRequestedAt];
    const revById = fieldMapping[CLICKUP_AUDIT_FIELDS.revisionRequestedBy];
    if (revAtId) await setTaskCustomFieldValue(taskId, revAtId, eventDate, clickUp.token);
    if (revById) await setTaskCustomFieldValue(taskId, revById, actor, clickUp.token);
  }

  // 6. Invalidate read cache
  invalidateRfpCache(task.team_id, task.list?.id);

  return NextResponse.json({
    success: true,
    taskId,
    milestone: milestoneKey,
    timestamp: eventDate,
    eventId,
  });
}
