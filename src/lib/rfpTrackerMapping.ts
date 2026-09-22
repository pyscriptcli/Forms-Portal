import { resolveRfpMilestone, ORDERED_MILESTONE_KEYS, type RfpMilestoneKey } from "./rfpWorkflow";
import {
  CLICKUP_MILESTONE_FIELDS,
  CLICKUP_MILESTONE_ACTOR_FIELDS,
  CLICKUP_METADATA_FIELDS,
  CLICKUP_AUDIT_FIELDS,
  resolveFieldIdMapping,
  type ClickUpFieldIdMapping,
} from "./clickupFields";
import { DEFAULT_WORKFLOW_STATUSES, type WorkflowStatuses } from "./adminSettings";
import { getMilestoneEntries } from "./rfpWorkflow";
import { parseRfpStructuredData } from "./rfpStructuredData";

export type MilestoneTimestamps = Partial<Record<RfpMilestoneKey, string>>;
export type MilestoneActors = Partial<Record<RfpMilestoneKey, string>>;

export interface TrackedRfp {
  taskId: string;
  requestId: string;
  taskName: string;
  formType: "rfp" | "gw-rfp" | "travel-budget" | "po" | "pcv";
  payee: string;
  department: string;
  totalAmount: number;
  lineItems?: Array<{ description: string; unitPrice: number; quantity: number; amount: number }>;
  dateNeeded: string;
  urgency: "urgent" | "normal";
  purpose: string;
  requestedBy: string;
  requestedByEmail?: string;
  approverName: string;
  approverEmail?: string;
  currentStage:
    | "submitted"
    | "endorsed"
    | "finance_verification"
    | "disbursement_prep"
    | "executive_signoff"
    | "completed"
    | "revision_requested";
  stageLabel: string;
  currentMilestone: string;
  stageIndex: number;
  isRevisionRequested: boolean;
  revisionReason?: string;
  revisionBy?: "tl" | "finance" | "approver";
  revisionRequestedAt?: string;
  revisionRequestedBy?: string;
  dateCreated: string;
  attachments: Array<{ id: string; name: string; url: string; type?: string }>;
  milestoneTimestamps: MilestoneTimestamps;
  milestoneActors: MilestoneActors;
  dataSource?: "custom_field" | "legacy_fallback";
}

function parseMarkdownLineItems(description: string): NonNullable<TrackedRfp["lineItems"]> {
  const section = description.match(/##\s*Line Item Breakdown\s*\r?\n([\s\S]*?)(?:\r?\n\s*\r?\n|$)/i)?.[1] || "";
  return section.split(/\r?\n/).slice(2).flatMap((line) => {
    if (!line.trim().startsWith("|") || /Total Price for Payment/i.test(line)) return [];
    const cells = line.split(/(?<!\\)\|/).slice(1, -1).map((cell) => cell.replace(/\\\|/g, "|").replace(/\*\*/g, "").trim());
    if (cells.length < 4) return [];
    const unitPrice = Number(cells[1].replace(/[,₱]/g, "")) || 0;
    const quantity = Number(cells[2].replace(/,/g, "")) || 0;
    const amount = Number(cells[3].replace(/[,₱]/g, "")) || quantity * unitPrice;
    return cells[0] ? [{ description: cells[0], unitPrice, quantity, amount }] : [];
  });
}

function parseLineItems(description: string): NonNullable<TrackedRfp["lineItems"]> {
  const structured = parseRfpStructuredData(description);
  if (structured?.lineItems.length) return structured.lineItems;
  return parseMarkdownLineItems(description);
}

/**
 * Formats a Unix timestamp or ISO string into Asia/Manila display format: "MMM d, yyyy, h:mm a"
 */
export function formatMilestoneTimestamp(val: unknown): string {
  if (!val) return "Timestamp unavailable";
  let ms: number;
  if (typeof val === "number") {
    ms = val;
  } else if (typeof val === "string") {
    const parsedNum = Number(val);
    if (!Number.isNaN(parsedNum) && parsedNum > 1000000000) {
      ms = parsedNum;
    } else {
      const d = new Date(val);
      ms = d.getTime();
    }
  } else {
    return "Timestamp unavailable";
  }

  if (Number.isNaN(ms) || ms <= 0) return "Timestamp unavailable";

  try {
    return new Intl.DateTimeFormat("en-PH", {
      timeZone: "Asia/Manila",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(ms));
  } catch {
    return "Timestamp unavailable";
  }
}

/**
 * Centralized mapping service for ClickUp task to TrackedRfp
 */
export function mapClickUpTaskToTrackedRfp(
  task: any,
  configuredMapping?: ClickUpFieldIdMapping,
  workflowStatusesOverride?: WorkflowStatuses
): TrackedRfp {
  const statuses = workflowStatusesOverride || DEFAULT_WORKFLOW_STATUSES;
  const statusStr = (task.status?.status || "").toLowerCase();
  const desc = task.markdown_description || task.description || "";
  const lineItems = parseLineItems(desc);
  const taskCustomFields: Array<{ id: string; name?: string; value?: any }> = Array.isArray(task.custom_fields)
    ? task.custom_fields
    : [];

  // Build quick lookup map by ID and by normalized name
  const fieldsById = new Map<string, any>();
  const fieldsByName = new Map<string, any>();
  for (const cf of taskCustomFields) {
    if (cf.id) fieldsById.set(cf.id, cf.value);
    if (cf.name) fieldsByName.set(cf.name.trim().toLowerCase(), cf.value);
  }

  // Resolve mapping
  const discoveredFieldMapping = resolveFieldIdMapping(
    taskCustomFields.map((cf) => ({ id: cf.id, name: cf.name || "", type: "text" }))
  );
  const fieldMapping = { ...discoveredFieldMapping, ...(configuredMapping || {}) };

  // Helper to read field value: check configured field ID first, then field name
  const getFieldValue = (fieldName: string): any => {
    const id = fieldMapping[fieldName];
    if (id && fieldsById.has(id)) {
      const val = fieldsById.get(id);
      if (val !== undefined && val !== null && val !== "") return val;
    }
    const lowerName = fieldName.trim().toLowerCase();
    if (fieldsByName.has(lowerName)) {
      const val = fieldsByName.get(lowerName);
      if (val !== undefined && val !== null && val !== "") return val;
    }
    return undefined;
  };

  // 1. Determine Form Type
  let formType: TrackedRfp["formType"] = "rfp";
  if (task.name.includes("[PO]") || desc.includes("Purchase Order (PO)")) {
    formType = "po";
  } else if (task.name.includes("[PCV]") || desc.includes("Petty Cash Voucher (PCV)")) {
    formType = "pcv";
  } else if (task.name.includes("[GW-RFP]") || desc.includes("GW RFP") || desc.includes("GreatWork")) {
    formType = "gw-rfp";
  } else if (task.name.includes("[TRAVEL-BUDGET]") || desc.includes("Travel Budget")) {
    formType = "travel-budget";
  }

  // 2. Read Metadata using Custom Fields
  let requestId = getFieldValue(CLICKUP_METADATA_FIELDS.requestId);
  let department = getFieldValue(CLICKUP_METADATA_FIELDS.department);
  const rawAmount = getFieldValue(CLICKUP_METADATA_FIELDS.totalAmount);
  let purpose = getFieldValue(CLICKUP_METADATA_FIELDS.purpose);
  let requestedBy = getFieldValue(CLICKUP_METADATA_FIELDS.requestedBy);
  let requestedByEmail = getFieldValue(CLICKUP_METADATA_FIELDS.requestedByEmail);
  let approverName = getFieldValue(CLICKUP_METADATA_FIELDS.approverName);
  const approverEmail = getFieldValue(CLICKUP_METADATA_FIELDS.approverEmail);

  let dataSource: "custom_field" | "legacy_fallback" = "custom_field";

  // Check if primary custom fields were populated
  if (!requestId && !department && rawAmount === undefined && !requestedBy) {
    dataSource = "legacy_fallback";
  }

  // 3. Fallbacks (Legacy String Parsing if custom fields are missing)
  let payee = "";
  let totalAmount = 0;
  if (rawAmount !== undefined && rawAmount !== null) {
    totalAmount = typeof rawAmount === "number" ? rawAmount : parseFloat(String(rawAmount).replace(/,/g, "")) || 0;
  }
  if (!totalAmount) {
    const amountMatch =
      desc.match(/\|\s*\*\*(?:Total Payable|Total Amount|Amount)\*\*\s*\|\s*(?:\*\*)?₱?\s*([\d,.]+)/i) ||
      desc.match(/[-*]\s*(?:Total Payable|Total Amount|Amount):\s*₱?\s*([\d,.]+)/i);
    if (amountMatch) {
      totalAmount = parseFloat(amountMatch[1].replace(/,/g, "")) || 0;
    }
  }

  // Fallback from task name: e.g. "[RFP-092026-0001] PRIME – ABC Company – Tarpaulin Installations" or "[RFP] Payee — ₱1,000 (Dept)"
  const idMatch = task.name.match(/\[(RFP-[\w-]+)\]/i);
  if (!requestId && idMatch) {
    requestId = idMatch[1].trim();
  }

  const nameMatch = task.name.match(/(?:\[(?:RFP|PO|PCV|GW-RFP|TRAVEL-BUDGET)[^\]]*\]\s*)(.+?)\s*(?:—|-)\s*₱?([\d,.]+)?\s*(?:\((.+?)\))?/i);
  if (nameMatch) {
    if (!payee) payee = nameMatch[1].trim();
    if (!totalAmount && nameMatch[2]) {
      totalAmount = parseFloat(nameMatch[2].replace(/,/g, "")) || 0;
    }
    if (!department && nameMatch[3]) {
      department = nameMatch[3].trim();
    }
  }

  // If task name is structured like "[RFP-XXXX] Entity – Payee – Purpose"
  const parts = task.name.replace(/^\[.*?\]\s*/, "").split(/\s*[–—\-]\s*/);
  if (parts.length >= 2) {
    if (!payee) payee = parts[1]?.trim() || parts[0]?.trim();
    if (!purpose && parts[2]) purpose = parts[2].trim();
  }

  if (!payee) payee = task.name.replace(/^🚨?\s*\[.*?\]\s*/, "").trim();

  // Fallback from description table or list
  if (!purpose) {
    const purposeMatch =
      desc.match(/\|\s*\*\*(?:Purpose|Notes|Particulars)\*\*\s*\|\s*(.+?)\s*\|/i) ||
      desc.match(/[-*]\s*(?:Purpose|Notes|Particulars):\s*(.+?)(?:\r?\n|$)/i);
    if (purposeMatch) {
      purpose = purposeMatch[1].replace(/_No purpose stated\._|_No additional notes\._/, "").trim();
    }
  }
  if (!requestedBy) {
    const reqMatch =
      desc.match(/\|\s*\*\*(?:Requested By|Prepared By)\*\*\s*\|\s*\*\*?(.+?)\*\*?\s*(?:\(|$)/i) ||
      desc.match(/[-*]\s*(?:Requested By|Prepared By|Requestor):\s*(.+?)(?:\r?\n|$)/i);
    if (reqMatch) requestedBy = reqMatch[1].trim();
  }
  if (!requestedByEmail) {
    const emailMatch =
      desc.match(/\|\s*\*\*(?:Requested By Email|Prepared By Email)\*\*\s*\|\s*([^|\n]+?)\s*\|/i) ||
      desc.match(/[-*]\s*(?:Requested By Email|Prepared By Email|Requestor Email):\s*(.+?)(?:\r?\n|$)/i);
    if (emailMatch) requestedByEmail = emailMatch[1].replace(/[\*_`]/g, "").trim().toLowerCase();
  }
  if (!approverName) {
    const appMatch =
      desc.match(/\|\s*\*\*(?:Approved By|Approver Name|TL Name)\*\*\s*\|\s*\*\*?(.+?)\*\*?\s*(?:\(|$)/i) ||
      desc.match(/[-*]\s*(?:Approved By|Approver Name|TL Name):\s*(.+?)(?:\r?\n|$)/i);
    if (appMatch) approverName = appMatch[1].trim();
  }
  if (!requestId) {
    const reqIdMatch =
      desc.match(/\|\s*\*\*(?:RFP ID|Request ID)\*\*\s*\|\s*([^|\n]+?)\s*\|/i) ||
      desc.match(/[-*]\s*(?:RFP ID|Request ID):\s*(.+?)(?:\r?\n|$)/i);
    if (reqIdMatch) requestId = reqIdMatch[1].replace(/[\*_`]/g, "").trim();
  }
  if (!department) {
    const deptMatch =
      desc.match(/\|\s*\*\*Department\*\*\s*\|\s*([^|\n]+?)\s*\|/i) ||
      desc.match(/[-*]\s*Department:\s*(.+?)(?:\r?\n|$)/i);
    if (deptMatch) department = deptMatch[1].replace(/[\*_`]/g, "").trim();
  }

  // 4. Workflow and Status Resolution
  const normalizedStatus = statusStr.replace(/[_-]/g, " ").replace(/\s+/g, " ").trim();
  const isDone = ["done", "complete", "completed", "closed"].includes(normalizedStatus);

  let isRevisionRequested = false;
  let revisionReason = "";
  const revisionReasonField = getFieldValue(CLICKUP_AUDIT_FIELDS.revisionReason);
  if (revisionReasonField !== undefined && revisionReasonField !== null) {
    revisionReason = String(revisionReasonField).trim();
  }
  const revisionRequestedAtValue = getFieldValue(CLICKUP_AUDIT_FIELDS.revisionRequestedAt);
  const revisionRequestedAt = formatMilestoneTimestamp(revisionRequestedAtValue);
  const revisionRequestedByValue = getFieldValue(CLICKUP_AUDIT_FIELDS.revisionRequestedBy);
  const revisionRequestedBy = revisionRequestedByValue ? String(revisionRequestedByValue).trim() : undefined;
  let revisionBy: "tl" | "finance" | "approver" = "approver";

  if (desc.includes("Revision Requested") || task.name.toLowerCase().includes("revision") || normalizedStatus.includes("revision")) {
    isRevisionRequested = true;
    const revMatch = desc.match(/(?:\*\*)?Reason:(?:\*\*)?\s*([^\n\r]+)/i);
    if (revMatch && !revisionReason) revisionReason = revMatch[1].trim();
    if (/Revision Requested by Finance/i.test(desc)) {
      revisionBy = "finance";
    } else {
      revisionBy = "tl";
    }
  }

  const processHistory = getFieldValue(CLICKUP_AUDIT_FIELDS.processHistory);
  let previousStatus = "";
  if (isRevisionRequested && typeof processHistory === "string") {
    for (const line of processHistory.split(/\r?\n/)) {
      const match = line.match(/^\[[^\]]+\]\s+.+?:\s+"([^"]*)"\s+->\s+"([^"]+)"/);
      if (match) previousStatus = match[1].trim();
    }
  }
  const resolved = resolveRfpMilestone(isRevisionRequested && previousStatus ? previousStatus : statusStr, statuses);
  let currentStage: TrackedRfp["currentStage"] = isDone
    ? "completed"
    : resolved.stageIndex === 5
    ? "completed"
    : resolved.stageIndex === 4
    ? "disbursement_prep"
    : resolved.stageIndex === 3
    ? "executive_signoff"
    : resolved.stageIndex === 2
    ? "finance_verification"
    : resolved.stageIndex === 1
    ? "endorsed"
    : "submitted";

  let stageLabel = resolved.stageLabel;
  let currentMilestone = resolved.status || resolved.stageLabel;
  let stageIndex = resolved.stageIndex;

  if (isRevisionRequested) {
    currentStage = "revision_requested";
    stageLabel = revisionBy === "finance" ? "Revision Requested by Finance" : "Revision Requested by Team Leader";
    if (revisionBy === "finance" && stageIndex < 2) stageIndex = 2;
    currentMilestone = "Revision Requested";
  }

  // 5. Milestone timestamps come only from the TS custom fields populated by
  // the status webhook. Never infer them from task-wide date_updated.
  const milestoneTimestamps: MilestoneTimestamps = {};
  for (const key of ORDERED_MILESTONE_KEYS) {
    const fieldName = CLICKUP_MILESTONE_FIELDS[key as keyof typeof CLICKUP_MILESTONE_FIELDS];
    const value = fieldName ? getFieldValue(fieldName) : undefined;
    if (value !== undefined && value !== null && value !== "") {
      const formatted = formatMilestoneTimestamp(value);
      if (formatted !== "Timestamp unavailable") milestoneTimestamps[key] = formatted;
    }
  }

  // The webhook writes the authoritative ClickUp activity actor alongside
  // each status transition in process history. Associate the latest event
  // for each configured milestone so the frontend can show who moved it.
  const milestoneActors: MilestoneActors = {};
  for (const key of ORDERED_MILESTONE_KEYS) {
    const fieldName = CLICKUP_MILESTONE_ACTOR_FIELDS[key as keyof typeof CLICKUP_MILESTONE_ACTOR_FIELDS];
    const value = fieldName ? getFieldValue(fieldName) : undefined;
    if (typeof value === "string" && value.trim()) milestoneActors[key] = value.trim();
  }
  if (typeof processHistory === "string" && processHistory.trim()) {
    const normalizeStatus = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ");
    const milestoneEntries = getMilestoneEntries(statuses);
    for (const line of processHistory.split(/\r?\n/)) {
      const match = line.match(/^\[[^\]]+\]\s+(.+?):\s+"[^"]*"\s+->\s+"([^"]+)"/);
      if (!match) continue;
      const actor = match[1].trim();
      const afterStatus = match[2].trim();
      const entry = milestoneEntries.find((candidate) => normalizeStatus(candidate.status) === normalizeStatus(afterStatus));
      if (entry && actor && !milestoneActors[entry.key]) milestoneActors[entry.key] = actor;
    }
  }

  // 6. Attachments (Sanitize and extract clean links)
  const attachments = Array.isArray(task.attachments)
    ? task.attachments.map((att: any) => ({
        id: String(att.id || ""),
        name: String(att.name || att.title || "Attachment"),
        url: String(att.url || att.thumbnail_large || ""),
        type: att.mimetype || att.type,
      }))
    : [];

  const urgency: "urgent" | "normal" = task.priority?.priority === "urgent" ? "urgent" : "normal";
  const dateNeeded = task.due_date ? new Date(Number(task.due_date)).toISOString().split("T")[0] : "";
  const dateCreated = task.date_created ? new Date(Number(task.date_created)).toISOString() : new Date().toISOString();

  // Explicitly NEVER return task URLs or raw task objects to client
  return {
    taskId: String(task.id),
    requestId: String(requestId || task.id),
    taskName: String(task.name || "Untitled Request"),
    formType,
    payee: String(payee || ""),
    department: String(department || "General"),
    totalAmount: Number(totalAmount || 0),
    lineItems,
    dateNeeded,
    urgency,
    purpose: String(purpose || ""),
    requestedBy: String(requestedBy || "Requester"),
    requestedByEmail: requestedByEmail ? String(requestedByEmail) : undefined,
    approverName: String(approverName || "Team Leader"),
    approverEmail: approverEmail ? String(approverEmail) : undefined,
    currentStage,
    stageLabel,
    currentMilestone,
    stageIndex,
    isRevisionRequested,
    revisionReason,
    revisionBy,
    revisionRequestedAt: revisionRequestedAt !== "Timestamp unavailable" ? revisionRequestedAt : undefined,
    revisionRequestedBy,
    dateCreated,
    attachments,
    milestoneTimestamps,
    milestoneActors,
    dataSource,
  };
}
