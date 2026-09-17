import {
  RfpFormData,
  PoFormData,
  PcvFormData,
  ClickUpTaskResponse,
  FormType,
} from "@/types/rfp";
import { readFileSync } from "fs";
import path from "path";
import {
  DEFAULT_FORM_DESTINATIONS,
  normalizeFormDestinations,
  DEFAULT_WORKFLOW_STATUSES,
  normalizeWorkflowStatuses,
  type WorkflowStatuses,
  type FormDestinationKey,
} from "@/lib/adminSettings";
import { formatRfpReference, formatRfpTaskName, highestRfpSequence } from "@/lib/rfpNaming";
import {
  CLICKUP_METADATA_FIELDS,
  CLICKUP_AUDIT_FIELDS,
  resolveFieldIdMapping,
  formatCustomFieldValueForWrite,
} from "@/lib/clickupFields";

const CLICKUP_API_BASE = "https://api.clickup.com/api/v2";
const DEFAULT_SUBMISSIONS_LIST_ID = "901420772915";

function getAdminDestination(formType: FormType) {
  try {
    const settingsPath = path.join(process.cwd(), "src", "lib", "featureFlags.json");
    const parsed = JSON.parse(readFileSync(settingsPath, "utf8")) as { destinations?: unknown };
    return normalizeFormDestinations(parsed.destinations)[formType as FormDestinationKey];
  } catch {
    return DEFAULT_FORM_DESTINATIONS[formType as FormDestinationKey];
  }
}

function getConfiguredWorkflowStatuses(): WorkflowStatuses {
  try {
    const settingsPath = path.join(process.cwd(), "src", "lib", "featureFlags.json");
    const parsed = JSON.parse(readFileSync(settingsPath, "utf8")) as { workflowStatuses?: unknown };
    return normalizeWorkflowStatuses(parsed.workflowStatuses);
  } catch {
    return DEFAULT_WORKFLOW_STATUSES;
  }
}

export function getClickUpConfig(formType: FormType = "rfp", oauthToken?: string, listIdOverride?: string) {
  const token = oauthToken || process.env.CLICKUP_API_TOKEN || "";
  const isOAuth = Boolean(oauthToken && !oauthToken.startsWith("pk_"));
  let listId = listIdOverride?.trim() || "";
  const adminDestination = getAdminDestination(formType);

  // Explicit environment variables remain the highest-priority override for
  // deployments, followed by the admin table, then the built-in default.
  if (!listId && formType === "po") {
    listId =
      process.env.PO_LIST_ID ||
      process.env.CLICKUP_PO_LIST_ID ||
      process.env.CLICKUP_LIST_ID ||
      "";
  } else if (!listId && formType === "pcv") {
    listId =
      process.env.PCV_LIST_ID ||
      process.env.CLICKUP_PCV_LIST_ID ||
      process.env.CLICKUP_LIST_ID ||
      "";
  } else if (!listId) {
    // Deployment-specific RFP override; the admin destination and built-in
    // default are applied below when this is empty.
    listId =
      process.env.RFP_LIST_ID ||
      process.env.CLICKUP_RFP_LIST_ID ||
      process.env.CLICKUP_LIST_ID ||
      "";
  }

  if (!listId && adminDestination?.enabled && adminDestination.listId) {
    listId = adminDestination.listId;
  }
  if (!listId && formType !== "po" && formType !== "pcv") {
    listId = DEFAULT_SUBMISSIONS_LIST_ID;
  }

  const isConfigured = Boolean(token && listId && token !== "mock" && !token.startsWith("pk_your"));
  return { token, listId, isConfigured, isOAuth };
}

function authorizationHeader(token: string, isOAuth: boolean): string {
  if (!token) return "";
  if (token.startsWith("pk_")) return token;
  if (token.startsWith("Bearer ")) return token;
  return isOAuth ? `Bearer ${token}` : token;
}

/**
 * Builds a clear, structured Markdown summary of the RFP for the ClickUp task description.
 */
export function buildTaskDescription(data: RfpFormData): string {
  const formattedTotal = Number(data.totalAmount || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const methodsDisplay =
    data.paymentMethods && data.paymentMethods.length > 0
      ? data.paymentMethods.map((m) => (m === "online" ? "Online Payment / Bank Transfer" : m.toUpperCase())).join(", ")
      : data.paymentMethod
      ? data.paymentMethod === "online" ? "Online Payment / Bank Transfer" : data.paymentMethod.toUpperCase()
      : "N/A";

  const isUrgent =
    data.urgency === "urgent" || (data.urgencyOptions && data.urgencyOptions.includes("urgent"));
  const urgencyDisplay = isUrgent ? "🚨 URGENT" : "Normal";

  // Clean payment and bank details display
  const bankParts = [
    data.bank && data.bank !== "N/A" ? `Bank: ${data.bank}` : "",
    data.accountName && data.accountName !== "N/A" ? `Acct Name: ${data.accountName}` : "",
    data.accountNumber && data.accountNumber !== "N/A" ? `Acct #: ${data.accountNumber}` : "",
  ].filter(Boolean);

  const paymentDetails =
    bankParts.length > 0 ? `${methodsDisplay} (${bankParts.join(" • ")})` : methodsDisplay;

  const lines = [
    `# 📋 Request for Payment (RFP)`,
    "",
    `| Field | Details |`,
    `| :--- | :--- |`,
    `| **Total Payable** | **₱${formattedTotal}** |`,
    `| **Payee** | **${data.payee || "N/A"}** |`,
    `| **Department** | ${data.department || "N/A"} |`,
    `| **Date Needed** | **${data.dateNeeded || "N/A"}** (${urgencyDisplay}) |`,
    `| **Payment Details** | ${paymentDetails} |`,
    `| **Purpose** | ${data.purpose ? data.purpose.replace(/\n/g, " ") : "_No purpose stated._"} |`,
    `| **RFP ID** | **${data.rfpCodeSuffix || "Pending Finance number"}** |`,
    `| **Requested By** | **${data.requestedByName || "N/A"}** (Date: ${data.date || "N/A"}) |`,
    `| **Requested By Email** | ${data.requestedByEmail || "N/A"} |`,
    "",
  ];

  return lines.join("\n");
}

/**
 * Builds a clear, structured Markdown summary of the Purchase Order for the ClickUp task description.
 */
export function buildPoTaskDescription(data: PoFormData): string {
  const formattedTotal = Number(data.totalAmountDue || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const formattedSubtotal = Number(data.subtotal || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const formattedVat = Number(data.vatAmount || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const formattedEwt = Number(data.withholdingTaxAmount || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const isUrgent = data.urgency === "urgent";
  const urgencyDisplay = isUrgent ? "🚨 URGENT" : "Normal";

  const lines = [
    `# 📦 Purchase Order (PO)`,
    "",
    `| Field | Details |`,
    `| :--- | :--- |`,
    `| **Total Amount Due** | **₱${formattedTotal}** |`,
    `| **Vendor Name** | **${data.vendorName || "N/A"}** |`,
    `| **PO Number** | **${data.poNumber || "N/A"}** |`,
    `| **Department** | ${data.department || "N/A"} |`,
    `| **Date Needed** | **${data.dateNeeded || "N/A"}** (${urgencyDisplay}) |`,
    `| **Vendor TIN** | ${data.tin || "N/A"} |`,
    `| **Contact / Acct Mgr** | ${[data.accountManager, data.contactNo, data.emailAddress].filter(Boolean).join(" • ") || "N/A"} |`,
    `| **Financial Breakdown** | Subtotal: ₱${formattedSubtotal} • VAT (12%): ₱${formattedVat} • EWT (2%): ₱${formattedEwt} |`,
    `| **Notes** | ${data.additionalNotes ? data.additionalNotes.replace(/\n/g, " ") : "_No additional notes._"} |`,
    `| **Prepared By** | **${data.preparedByName || "N/A"}** (Date: ${data.date || "N/A"}) |`,
    "",
    `---`,
    `### 🔄 Processing Checklist`,
    `- [ ] **1. Department / Team Leader Endorsement** — Verified requirement & purpose`,
    `- [ ] **2. Finance Verification** — Encoded in Zoho & Top Sheet prepared`,
    `- [ ] **3. Disbursement Preparation** — Uploaded to UnionBank (UB) / Check prepared`,
    `- [ ] **4. Executive Sign-Off** — CFO / CEO reviewed & signed`,
    `- [ ] **5. Payment Released & Completed** — Proof of payment sent & filed`,
  ];

  return lines.join("\n");
}

/**
 * Builds a clear, structured Markdown summary of the Petty Cash Voucher for the ClickUp task description.
 */
export function buildPcvTaskDescription(data: PcvFormData): string {
  const formattedAmount = Number(data.amount || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const isUrgent = data.urgency === "urgent";
  const urgencyDisplay = isUrgent ? "🚨 URGENT" : "Normal";

  const particularsSummary =
    data.particulars && data.particulars.length > 0
      ? data.particulars
          .map(
            (p) =>
              `${p.description || "Item"} (₱${Number(p.amount || 0).toLocaleString("en-US")})`
          )
          .join(" • ")
      : "None listed";

  const lines = [
    `# 💵 Petty Cash Voucher (PCV)`,
    "",
    `| Field | Details |`,
    `| :--- | :--- |`,
    `| **Amount** | **₱${formattedAmount}** |`,
    `| **Payee (Employee)** | **${data.payee || "N/A"}** |`,
    `| **Department** | ${data.department || "N/A"} |`,
    `| **Voucher No** | **${data.voucherNo || "N/A"}** |`,
    `| **Date** | ${data.date || "N/A"} (${urgencyDisplay}) |`,
    `| **Particulars** | ${particularsSummary} |`,
    `| **Requested By** | **${data.requestedByName || "N/A"}** |`,
    "",
    `---`,
    `### 🔄 Processing Checklist`,
    `- [ ] **1. Department / Team Leader Endorsement** — Verified requirement & purpose`,
    `- [ ] **2. Finance Verification** — Encoded in Zoho & Top Sheet prepared`,
    `- [ ] **3. Disbursement Preparation** — Uploaded to UnionBank (UB) / Check prepared`,
    `- [ ] **4. Executive Sign-Off** — CFO / CEO reviewed & signed`,
    `- [ ] **5. Payment Released & Completed** — Proof of payment sent & filed`,
  ];

  return lines.join("\n");
}

/**
 * Gets custom field definitions for a ClickUp list.
 */
export async function getListCustomFields(
  listId: string,
  token?: string
): Promise<Array<{ id: string; name: string; type: string }>> {
  const authToken = token || process.env.CLICKUP_API_TOKEN || "";
  if (!authToken || authToken === "mock") return [];

  try {
    const res = await fetch(`${CLICKUP_API_BASE}/list/${listId}/field`, {
      headers: {
        Authorization: authToken.startsWith("Bearer ") ? authToken : authToken,
      },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.fields || [];
  } catch (err) {
    console.error(`Error getting custom fields for list ${listId}:`, err);
    return [];
  }
}

/**
 * Sets a single custom field value on a ClickUp task.
 */
export async function setTaskCustomFieldValue(
  taskId: string,
  fieldId: string,
  value: any,
  token?: string
): Promise<boolean> {
  const authToken = token || process.env.CLICKUP_API_TOKEN || "";
  if (!authToken || authToken === "mock" || taskId.startsWith("MOCK-")) return true;

  try {
    const isTimestamp = typeof value === "number" && value > 1_000_000_000_000;
    const bodyPayload = isTimestamp
      ? { value: Math.round(value), value_options: { time: true } }
      : { value };

    const res = await fetch(`${CLICKUP_API_BASE}/task/${taskId}/field/${fieldId}`, {
      method: "POST",
      headers: {
        Authorization: authToken.startsWith("Bearer ") ? authToken : authToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(bodyPayload),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.warn(`ClickUp custom field ${fieldId} set failed (${res.status}): ${errText}`);

      // Fallback 1: If value_options rejected, try simple { value: Math.round(value) }
      if (isTimestamp) {
        const fallbackRes = await fetch(`${CLICKUP_API_BASE}/task/${taskId}/field/${fieldId}`, {
          method: "POST",
          headers: {
            Authorization: authToken.startsWith("Bearer ") ? authToken : authToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ value: Math.round(value) }),
        });
        if (fallbackRes.ok) return true;
      }

      // Fallback 2: If error is FIELD_018 (Value is not a valid string), retry with String(value)
      if (errText.includes("FIELD_018") || errText.includes("not a valid string")) {
        const retryRes = await fetch(`${CLICKUP_API_BASE}/task/${taskId}/field/${fieldId}`, {
          method: "POST",
          headers: {
            Authorization: authToken.startsWith("Bearer ") ? authToken : authToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ value: String(value) }),
        });
        return retryRes.ok;
      }
      return false;
    }

    return true;
  } catch (err) {
    console.error(`Error setting custom field ${fieldId} on task ${taskId}:`, err);
    return false;
  }
}

/**
 * Fetches time-in-status history for a ClickUp task.
 */
export async function getClickUpTaskTimeInStatus(
  taskId: string,
  token?: string
): Promise<{
  current_status?: { status: string; total_time?: { since?: string | number } };
  status_history?: Array<{ status: string; total_time?: { since?: string | number } }>;
} | null> {
  const authToken = token || process.env.CLICKUP_API_TOKEN || "";
  if (!authToken || authToken === "mock" || !taskId || taskId.startsWith("MOCK-")) return null;

  try {
    const res = await fetch(`${CLICKUP_API_BASE}/task/${taskId}/time_in_status`, {
      headers: {
        Authorization: authToken.startsWith("Bearer ") ? authToken : authToken,
      },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn(`Failed to fetch time_in_status for task ${taskId}:`, err);
    return null;
  }
}

/**
 * Registers a webhook on a ClickUp list via the Workspace (Team) endpoint.
 */
export async function createClickUpWebhook(
  listId: string,
  endpointUrl: string,
  token?: string,
  workspaceId?: string
): Promise<{ id: string; secret: string; webhook?: any }> {
  const authToken = token || process.env.CLICKUP_API_TOKEN || "";
  if (!authToken || authToken === "mock") {
    throw new Error("ClickUp API token not configured.");
  }

  let teamId = workspaceId;
  if (!teamId) {
    try {
      const settingsPath = path.join(process.cwd(), "src", "lib", "featureFlags.json");
      const parsed = JSON.parse(readFileSync(settingsPath, "utf8")) as any;
      teamId = parsed.destinations?.rfp?.workspaceId || parsed.workspaceId;
    } catch {
      // Ignore
    }
  }

  if (!teamId) {
    try {
      const teamRes = await fetch(`${CLICKUP_API_BASE}/team`, {
        headers: {
          Authorization: authToken.startsWith("Bearer ") ? authToken : authToken,
        },
      });
      if (teamRes.ok) {
        const teamData = await teamRes.json();
        if (Array.isArray(teamData.teams) && teamData.teams.length > 0) {
          teamId = String(teamData.teams[0].id);
        }
      }
    } catch (err) {
      console.warn("Could not query ClickUp teams for webhook registration:", err);
    }
  }

  if (!teamId) {
    throw new Error("ClickUp Workspace ID (team_id) not found to register webhook.");
  }

  const res = await fetch(`${CLICKUP_API_BASE}/team/${teamId}/webhook`, {
    method: "POST",
    headers: {
      Authorization: authToken.startsWith("Bearer ") ? authToken : authToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      endpoint: endpointUrl,
      events: ["taskStatusUpdated"],
      list_id: listId,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to create ClickUp webhook (${res.status}): ${text}`);
  }

  const data = await res.json();
  return {
    id: data.id || data.webhook?.id,
    secret: data.webhook?.secret || data.secret,
    webhook: data.webhook,
  };
}

/**
 * Matches custom fields in the ClickUp list and formats the payload.
 */
async function getMatchingCustomFields(listId: string, token: string, data: any, editUrl: string) {
  try {
    const availableFields = await getListCustomFields(listId, token);
    if (!availableFields || availableFields.length === 0) return [];

    const fieldMapping = resolveFieldIdMapping(availableFields);
    const customFieldsPayload: Array<{ id: string; value: any }> = [];

    // Helper to add if mapped
    const addIfMapped = (canonicalName: string, rawVal: any, defaultFieldType: string = "text") => {
      const fieldId = fieldMapping[canonicalName];
      if (fieldId && rawVal !== undefined && rawVal !== null && rawVal !== "") {
        const fieldDef = availableFields.find((f) => f.id === fieldId);
        const actualType = (fieldDef?.type || defaultFieldType).toLowerCase();
        const formatted = formatCustomFieldValueForWrite(actualType, rawVal);
        if (formatted !== null) {
          customFieldsPayload.push({ id: fieldId, value: formatted });
        }
      }
    };

    // Contract metadata fields
    addIfMapped(CLICKUP_METADATA_FIELDS.requestId, data.rfpCodeSuffix || data.requestId || "");
    addIfMapped(CLICKUP_METADATA_FIELDS.entityCode, data.entityCode || "PRIME");
    addIfMapped(CLICKUP_METADATA_FIELDS.department, data.department || "");
    addIfMapped(CLICKUP_METADATA_FIELDS.totalAmount, Number(data.totalAmount || data.amount || 0), "money");
    addIfMapped(CLICKUP_METADATA_FIELDS.purpose, data.purpose || "");
    addIfMapped(CLICKUP_METADATA_FIELDS.requestedBy, data.requestedByName || "");
    addIfMapped(CLICKUP_METADATA_FIELDS.requestedByEmail, data.requestedByEmail || "");
    addIfMapped(CLICKUP_METADATA_FIELDS.approverName, data.tlSignatureName || data.approvedByName || "");
    addIfMapped(CLICKUP_METADATA_FIELDS.approverEmail, data.approverEmail || "");

    // Additional common fields by fuzzy name if not already mapped
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
    availableFields.forEach((field) => {
      const name = normalize(field.name);
      const isAlreadyMapped = customFieldsPayload.some((item) => item.id === field.id);
      if (isAlreadyMapped) return;

      const actualType = (field.type || "text").toLowerCase();

      if (name.includes("payee") && data.payee) {
        const val = formatCustomFieldValueForWrite(actualType, data.payee);
        if (val !== null) customFieldsPayload.push({ id: field.id, value: val });
      } else if (name.includes("bank") && data.bank) {
        const val = formatCustomFieldValueForWrite(actualType, data.bank);
        if (val !== null) customFieldsPayload.push({ id: field.id, value: val });
      } else if (name.includes("accountname") && data.accountName) {
        const val = formatCustomFieldValueForWrite(actualType, data.accountName);
        if (val !== null) customFieldsPayload.push({ id: field.id, value: val });
      } else if (name.includes("accountnum") && data.accountNumber) {
        const val = formatCustomFieldValueForWrite(actualType, data.accountNumber);
        if (val !== null) customFieldsPayload.push({ id: field.id, value: val });
      } else if (
        (name.includes("edit") || name.includes("formurl")) &&
        !name.includes("revision") &&
        !name.includes("status") &&
        !name.includes("ts")
      ) {
        const val = formatCustomFieldValueForWrite(actualType, editUrl);
        if (val !== null) customFieldsPayload.push({ id: field.id, value: val });
      }
    });

    return customFieldsPayload;
  } catch (err) {
    console.error("Error fetching ClickUp custom fields:", err);
    return [];
  }
}

/**
 * Creates a new ClickUp Task for the RFP.
 */
export async function createClickUpTask(
  data: any,
  appUrl: string,
  formType: FormType = "rfp",
  oauthToken?: string,
  listIdOverride?: string,
  workflowStatusesOverride?: WorkflowStatuses
): Promise<ClickUpTaskResponse> {
  const actualFormType = formType || data.formType || "rfp";
  const { token, listId, isConfigured, isOAuth } = getClickUpConfig(actualFormType, oauthToken, listIdOverride);
  const workflowStatuses = workflowStatusesOverride || getConfiguredWorkflowStatuses();

  const isUrgent =
    data.urgency === "urgent" || (data.urgencyOptions && data.urgencyOptions.includes("urgent"));
  const priorityPrefix = isUrgent ? "🚨 [URGENT] " : "";

  let taskName = "";
  let desc = "";

  if (formType === "po" || data.formType === "po") {
    const formattedTotal = Number(data.totalAmountDue || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    taskName = `${priorityPrefix}[PO] ${data.vendorName || "Untitled Vendor"} — ₱${formattedTotal} (${data.department || "Procurement"})`;
    desc = buildPoTaskDescription(data as PoFormData);
  } else if (formType === "pcv" || data.formType === "pcv") {
    const formattedTotal = Number(data.amount || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    taskName = `${priorityPrefix}[PCV] ${data.payee || "Employee"} — ₱${formattedTotal} (${data.department || "General"})`;
    desc = buildPcvTaskDescription(data as PcvFormData);
  } else {
    const formattedTotal = Number(data.totalAmount || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    // RFP task names are the SSOT display name. Urgency is stored in ClickUp
    // priority / form data, never added to the canonical task name.
    taskName = formatRfpTaskName(data.rfpCodeSuffix || "RFP-PENDING", data.entityCode || "PRIME", data.payee || "Untitled Payee", data.purpose || "Request for payment");
    desc = buildTaskDescription(data as RfpFormData);
  }

  if (!isConfigured) {
    throw new Error(
      "ClickUp is not configured. Sign in with ClickUp before submitting, or configure CLICKUP_API_TOKEN and a destination List ID in Vercel."
    );
  }

  const priority = isUrgent ? 1 : 3;

  // Configuration can cross JSON/database boundaries where a ClickUp status
  // response object is accidentally persisted instead of its string label.
  // The Create Task API only accepts a literal string for `status`.
  const configuredInitialStatus = workflowStatuses.requestorFormSubmission as unknown;
  const initialStatus = typeof configuredInitialStatus === "string"
    ? configuredInitialStatus.trim()
    : configuredInitialStatus && typeof configuredInitialStatus === "object" &&
        typeof (configuredInitialStatus as { status?: unknown }).status === "string"
      ? (configuredInitialStatus as { status: string }).status.trim()
      : DEFAULT_WORKFLOW_STATUSES.requestorFormSubmission;

  const body: any = {
    name: String(taskName),
    description: String(desc),
    markdown_content: String(desc),
    status: initialStatus || DEFAULT_WORKFLOW_STATUSES.requestorFormSubmission,
    priority,
    notify_all: true,
  };

  // Sync Due Date to ClickUp if dateNeeded is provided
  if (data.dateNeeded) {
    const dueDateMs = new Date(data.dateNeeded).getTime();
    if (!isNaN(dueDateMs)) {
      body.due_date = dueDateMs;
      body.due_date_time = false;
    }
  }

  // Populate custom fields (metadata + submission milestone timestamp)
  const cleanedAppUrl = (appUrl || "").replace(/\/+$/, "");
  const customFields = await getMatchingCustomFields(listId, token, data, `${cleanedAppUrl}/form?taskId=PENDING`);
  if (customFields.length > 0) {
    body.custom_fields = customFields;
  }

  // 1. Create task with the administrator-configured initial status
  let createRes = await fetch(`${CLICKUP_API_BASE}/list/${listId}/task`, {
    method: "POST",
    headers: {
      Authorization: authorizationHeader(token, isOAuth),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  // Resilient fallback: If task creation failed due to a custom field validation error (e.g. FIELD_018)
  if (!createRes.ok && body.custom_fields && body.custom_fields.length > 0) {
    const errText = await createRes.clone().text().catch(() => "");
    if (createRes.status === 400 && (errText.includes("FIELD_") || errText.includes("custom_field") || errText.includes("valid string"))) {
      console.warn(
        `ClickUp task creation failed with custom field error (${errText}). Retrying task creation without custom_fields and applying fields individually...`
      );

      const payloadWithoutCustomFields = { ...body };
      delete payloadWithoutCustomFields.custom_fields;

      const retryRes = await fetch(`${CLICKUP_API_BASE}/list/${listId}/task`, {
        method: "POST",
        headers: {
          Authorization: authorizationHeader(token, isOAuth),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payloadWithoutCustomFields),
      });

      if (retryRes.ok) {
        createRes = retryRes;
        const createdTask = await retryRes.clone().json().catch(() => ({}));
        const newTaskId = createdTask.id;

        // Apply custom fields individually in the background
        if (newTaskId && Array.isArray(customFields)) {
          Promise.all(
            customFields.map((field) =>
              setTaskCustomFieldValue(newTaskId, field.id, field.value, token).catch((err) => {
                console.warn(`Failed to set custom field ${field.id} on task ${newTaskId}:`, err);
              })
            )
          ).catch(() => {});
        }
      }
    }
  }

  if (!createRes.ok) {
    const errText = await createRes.text();
    if (createRes.status === 401 && errText.includes("OAUTH_027")) {
      throw new Error(`ClickUp OAuth account has not authorized workspace ${data.clickupWorkspaceId || "configured for this form"}. Sign out and sign in again with a ClickUp account that has access to that workspace.`);
    }
    throw new Error(`ClickUp task creation failed (${createRes.status}): ${errText}`);
  }

  const createdTask = await createRes.json();
  const taskId = createdTask.id;
  const taskUrl = createdTask.url || `https://app.clickup.com/t/${taskId}`;

  return {
    id: taskId,
    name: taskName,
    url: taskUrl,
    isMock: false,
    status: createdTask.status,
  };
}

/**
 * Updates an existing ClickUp Task for a revision.
 */
export async function updateClickUpTask(
  taskId: string,
  data: any,
  appUrl: string,
  formType: FormType = "rfp",
  oauthToken?: string,
  listIdOverride?: string
): Promise<ClickUpTaskResponse> {
  const actualFormType = formType || data.formType || "rfp";
  const { token, listId, isConfigured, isOAuth } = getClickUpConfig(actualFormType, oauthToken, listIdOverride);

  const isUrgent =
    data.urgency === "urgent" || (data.urgencyOptions && data.urgencyOptions.includes("urgent"));
  const priorityPrefix = isUrgent ? "🚨 [URGENT] " : "";

  let taskName = "";
  let desc = "";

  if (formType === "po" || data.formType === "po") {
    const formattedTotal = Number(data.totalAmountDue || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    taskName = `${priorityPrefix}[PO - Revised] ${data.vendorName || "Untitled Vendor"} — ₱${formattedTotal} (${data.department || "Procurement"})`;
    desc = buildPoTaskDescription(data as PoFormData);
  } else if (formType === "pcv" || data.formType === "pcv") {
    const formattedTotal = Number(data.amount || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    taskName = `${priorityPrefix}[PCV - Revised] ${data.payee || "Employee"} — ₱${formattedTotal} (${data.department || "General"})`;
    desc = buildPcvTaskDescription(data as PcvFormData);
  } else {
    const formattedTotal = Number(data.totalAmount || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    taskName = formatRfpTaskName(data.rfpCodeSuffix || "RFP-PENDING", data.entityCode || "PRIME", data.payee || "Untitled Payee", data.purpose || "Request for payment");
    desc = buildTaskDescription(data as RfpFormData);
  }

  if (!isConfigured || taskId.startsWith("MOCK-")) {
    return {
      id: taskId,
      name: taskName,
      url: `https://app.clickup.com/t/${taskId}`,
      isMock: true,
      status: { status: "revised", color: "#3b82f6" },
    };
  }

  const priority = isUrgent ? 1 : 3;

  const updateBody: any = {
    name: taskName,
    description: desc,
    markdown_description: desc,
    priority,
  };

  if (data.dateNeeded) {
    const dueDateMs = new Date(data.dateNeeded).getTime();
    if (!isNaN(dueDateMs)) {
      updateBody.due_date = dueDateMs;
      updateBody.due_date_time = false;
    }
  }

  const updateRes = await fetch(`${CLICKUP_API_BASE}/task/${taskId}`, {
    method: "PUT",
    headers: {
      Authorization: authorizationHeader(token, isOAuth),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updateBody),
  });

  if (!updateRes.ok) {
    const errText = await updateRes.text();
    throw new Error(`ClickUp task update failed (${updateRes.status}): ${errText}`);
  }

  const updated = await updateRes.json();
  return {
    id: taskId,
    name: taskName,
    url: updated.url || `https://app.clickup.com/t/${taskId}`,
    isMock: false,
    status: updated.status,
  };
}

export interface UploadAttachmentResult {
  success: boolean;
  url?: string;
  id?: string;
  error?: string;
}

export async function deleteClickUpTask(taskId: string, oauthToken?: string): Promise<void> {
  const { token, isConfigured, isOAuth } = getClickUpConfig("rfp", oauthToken);
  if (!isConfigured || taskId.startsWith("MOCK-")) return;

  const response = await fetch(`${CLICKUP_API_BASE}/task/${taskId}`, {
    method: "DELETE",
    headers: { Authorization: authorizationHeader(token, isOAuth) },
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`ClickUp task rollback failed (${response.status})${detail ? `: ${detail.slice(0, 240)}` : "."}`);
  }
}

/**
 * Uploads a file attachment to a ClickUp task.
 */
export async function uploadAttachmentToTask(
  taskId: string,
  fileBlob: Blob,
  filename: string,
  oauthToken?: string
): Promise<UploadAttachmentResult> {
  const { token, isConfigured, isOAuth } = getClickUpConfig("rfp", oauthToken);

  if (!isConfigured || taskId.startsWith("MOCK-")) {
    console.log(`[Mock Mode] Attachment simulated for task ${taskId}: ${filename}`);
    return { success: true, url: `https://mock.clickup.com/attachments/${filename}` };
  }

  let lastError = "ClickUp attachment upload failed.";
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const formData = new FormData();
      formData.append("attachment", fileBlob, filename);

      const res = await fetch(`${CLICKUP_API_BASE}/task/${taskId}/attachment`, {
        method: "POST",
        headers: { Authorization: authorizationHeader(token, isOAuth) },
        body: formData,
      });

      if (res.ok) {
        // ClickUp may acknowledge an attachment with an empty 2xx body.
        const responseText = await res.text().catch(() => "");
        let json: { url?: string; id?: string } = {};
        if (responseText.trim()) {
          try { json = JSON.parse(responseText); } catch { /* metadata is optional */ }
        }
        return { success: true, url: json.url, id: json.id };
      }

      const errorBody = await res.text().catch(() => "");
      lastError = `ClickUp rejected ${filename} (${res.status})${errorBody ? `: ${errorBody.slice(0, 240)}` : "."}`;
      if (![408, 425, 429].includes(res.status) && res.status < 500) break;
    } catch (err) {
      lastError = err instanceof Error ? err.message : "ClickUp connection failed.";
    }
    if (attempt < 1) await new Promise((resolve) => setTimeout(resolve, 300));
  }
  console.error(`Failed to upload attachment ${filename}: ${lastError}`);
  return { success: false, error: lastError };
}

/**
 * Updates the task description in ClickUp.
 */
export async function updateClickUpTaskDescription(
  taskId: string,
  description: string
): Promise<boolean> {
  const { token, isConfigured } = getClickUpConfig();

  if (!isConfigured || taskId.startsWith("MOCK-")) {
    return true;
  }

  try {
    const res = await fetch(`${CLICKUP_API_BASE}/task/${taskId}`, {
      method: "PUT",
      headers: {
        Authorization: token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        description,
        markdown_description: description,
      }),
    });

    return res.ok;
  } catch (err) {
    console.error(`Error updating description for task ${taskId}:`, err);
    return false;
  }
}

/**
 * Retrieves a ClickUp task for revision pre-population.
 */
export async function getClickUpTask(taskId: string, oauthToken?: string): Promise<any> {
  const { token, isConfigured, isOAuth } = getClickUpConfig("rfp", oauthToken);

  if (!isConfigured || taskId.startsWith("MOCK-")) {
    return null;
  }

  const res = await fetch(`${CLICKUP_API_BASE}/task/${taskId}?include_markdown_description=true`, {
    headers: { Authorization: authorizationHeader(token, isOAuth) },
  });

  if (!res.ok) {
    return null;
  }

  return await res.json();
}

export function taskHasAttachmentNamed(task: any, filename: string): boolean {
  const target = filename.trim().toLowerCase();
  return Array.isArray(task?.attachments) && task.attachments.some((attachment: any) =>
    String(attachment?.title || attachment?.filename || attachment?.name || "").trim().toLowerCase() === target
  );
}

/**
 * Fetches all tasks from the configured ClickUp list.
 */
export async function getListTasks(
  includeClosed: boolean = true,
  formType: FormType = "rfp",
  oauthToken?: string,
  listIdOverride?: string,
  options?: {
    includeMarkdownDescription?: boolean;
    orderBy?: "created" | "updated" | "due_date";
    reverse?: boolean;
    subtasks?: boolean;
    timeoutMs?: number;
    throwOnError?: boolean;
  }
): Promise<any[]> {
  const { token, listId, isConfigured, isOAuth } = getClickUpConfig(formType, oauthToken, listIdOverride);

  if (!isConfigured) {
    if (options?.throwOnError) throw new Error("ClickUp is not configured for this form.");
    return [];
  }

  try {
    const params = new URLSearchParams({
      include_closed: String(includeClosed),
      subtasks: String(options?.subtasks ?? true),
      include_markdown_description: String(options?.includeMarkdownDescription ?? true),
    });
    if (options?.orderBy) params.set("order_by", options.orderBy);
    if (options?.reverse !== undefined) params.set("reverse", String(options.reverse));
    const url = `${CLICKUP_API_BASE}/list/${listId}/task?${params.toString()}`;
    const res = await fetch(url, {
      headers: { Authorization: authorizationHeader(token, isOAuth) },
      cache: "no-store",
      signal: AbortSignal.timeout(options?.timeoutMs ?? 15000),
    });

    if (!res.ok) {
      const detail = await res.text();
      if (options?.throwOnError) throw new Error(`ClickUp task lookup failed (${res.status}): ${detail}`);
      console.error(`Failed to fetch tasks from list ${listId}:`, detail);
      return [];
    }

    const data = await res.json();
    return data.tasks || [];
  } catch (err) {
    if (options?.throwOnError) throw err;
    console.error("Error fetching list tasks:", err);
    return [];
  }
}

export async function readNextRfpReferenceFromClickUp(
  referenceMonth: string,
  oauthToken: string,
  listId: string
): Promise<{ reference: string; lastSequence: number }> {
  const tasks = await getListTasks(true, "rfp", oauthToken, listId, {
    includeMarkdownDescription: false,
    orderBy: "created",
    reverse: true,
    subtasks: false,
    timeoutMs: 4000,
    throwOnError: true,
  });
  const lastSequence = highestRfpSequence(tasks.map((task) => String(task?.name || "")));
  const nextSequence = lastSequence + 1;
  if (nextSequence > 9999) throw new Error("Finance RFP sequence limit reached at 9999.");
  return { reference: formatRfpReference(referenceMonth, nextSequence), lastSequence };
}

/**
 * Posts an audit comment on a ClickUp task.
 */
export async function postTaskComment(taskId: string, commentText: string, oauthToken?: string): Promise<boolean> {
  const { token, isConfigured, isOAuth } = getClickUpConfig("rfp", oauthToken);

  if (!isConfigured || taskId.startsWith("MOCK-")) {
    console.log(`[Mock Comment on ${taskId}]: ${commentText}`);
    return true;
  }

  try {
    const res = await fetch(`${CLICKUP_API_BASE}/task/${taskId}/comment`, {
      method: "POST",
      headers: {
        Authorization: authorizationHeader(token, isOAuth),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        comment_text: commentText,
        notify_all: true,
      }),
    });

    return res.ok;
  } catch (err) {
    console.error(`Error posting comment to task ${taskId}:`, err);
    return false;
  }
}

/**
 * Updates task status to "on going" and checks off the Team Leader checklist item.
 */
export async function approveTaskByApprover(
  taskId: string,
  approverName: string = "Team Leader",
  notes?: string,
  approverEmail?: string,
  options: {
    oauthToken?: string;
    workflowStatuses?: WorkflowStatuses;
    signatureDataUrl?: string;
    approvalDate?: string;
  } = {}
): Promise<boolean> {
  const { token, isConfigured, isOAuth } = getClickUpConfig("rfp", options.oauthToken);
  const workflowStatuses = options.workflowStatuses || getConfiguredWorkflowStatuses();

  if (!isConfigured || taskId.startsWith("MOCK-")) {
    return true;
  }

  try {
    const currentTask = await getClickUpTask(taskId, options.oauthToken);
    if (!currentTask) return false;

    if (!options.signatureDataUrl?.startsWith("data:image/") || !options.approvalDate) {
      console.error("Approval requires a signature and approval date.");
      return false;
    }

    // Persist approver metadata custom fields BEFORE advancing to Finance Validation
    if (Array.isArray(currentTask.custom_fields)) {
      const fieldMapping = resolveFieldIdMapping(
        currentTask.custom_fields.map((f: any) => ({ id: f.id, name: f.name, type: f.type }))
      );

      const approverNameId = fieldMapping[CLICKUP_METADATA_FIELDS.approverName];
      if (approverNameId && approverName) {
        const ok = await setTaskCustomFieldValue(taskId, approverNameId, approverName, token);
        if (!ok) {
          console.error(`Failed to persist approver name to custom field ${approverNameId}`);
          return false;
        }
      }

        const approverEmailId = fieldMapping[CLICKUP_METADATA_FIELDS.approverEmail];
        if (approverEmailId && approverEmail) {
          await setTaskCustomFieldValue(taskId, approverEmailId, approverEmail, token);
        }
      }

    let updatedDescription = currentTask.description || currentTask.markdown_description || "";
    let updateRes = await fetch(`${CLICKUP_API_BASE}/task/${taskId}`, {
      method: "PUT",
      headers: {
        Authorization: authorizationHeader(token, isOAuth),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status: workflowStatuses.financeValidation,
        description: updatedDescription,
        markdown_description: updatedDescription,
      }),
    });

    // OAuth users can read a task but may not have permission to update it.
    // Retry the write with the configured server token before reporting failure.
    if (!updateRes.ok && options.oauthToken) {
      const serviceConfig = getClickUpConfig("rfp");
      if (serviceConfig.isConfigured && serviceConfig.token !== token) {
        updateRes = await fetch(`${CLICKUP_API_BASE}/task/${taskId}`, {
          method: "PUT",
          headers: {
            Authorization: authorizationHeader(serviceConfig.token, false),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: workflowStatuses.financeValidation,
            description: updatedDescription,
            markdown_description: updatedDescription,
          }),
        });
      }
    }

    if (!updateRes.ok) {
      console.error("Failed to update task status:", await updateRes.text());
      return false;
    }

    const commentMsg = notes
      ? `✅ **Endorsed by ${approverName}**\nApproval date: ${options.approvalDate}\nSignature: Captured in the Forms Portal\nNotes: ${notes}\n\n*Status advanced to Finance Validation.*`
      : `✅ **Endorsed by ${approverName}**\nApproval date: ${options.approvalDate}\nSignature: Captured in the Forms Portal\n\n*Status advanced to Finance Validation.*`;

    await postTaskComment(taskId, commentMsg, options.oauthToken);
    return true;
  } catch (err) {
    console.error(`Error approving task ${taskId}:`, err);
    return false;
  }
}

/**
 * Records an approver or finance revision request and posts instructions to the task.
 */
export async function rejectTaskForRevision(
  taskId: string,
  approverName: string = "Team Leader",
  revisionReason: string,
  actorRole: "tl" | "finance" = "tl"
): Promise<boolean> {
  const { token, isConfigured } = getClickUpConfig();

  if (!isConfigured || taskId.startsWith("MOCK-")) {
    return true;
  }

  try {
    const workflowStatuses = getConfiguredWorkflowStatuses();
    const roleLabel = actorRole === "finance" ? "Finance & Accounting" : "Team Leader";
    const alertPrefix = `> ⚠️ **Revision Requested by ${roleLabel} (${approverName})**\n> **Reason:** ${revisionReason}\n\n`;

    const currentTask = await getClickUpTask(taskId);
    if (currentTask) {
      // Write revision audit custom fields if available
      if (Array.isArray(currentTask.custom_fields)) {
        const fieldMapping = resolveFieldIdMapping(
          currentTask.custom_fields.map((f: any) => ({ id: f.id, name: f.name, type: f.type }))
        );
        const revAtId = fieldMapping[CLICKUP_AUDIT_FIELDS.revisionRequestedAt];
        const revById = fieldMapping[CLICKUP_AUDIT_FIELDS.revisionRequestedBy] || fieldMapping[CLICKUP_METADATA_FIELDS.approverName];
        if (revAtId) await setTaskCustomFieldValue(taskId, revAtId, Date.now(), token);
        if (revById) await setTaskCustomFieldValue(taskId, revById, approverName, token);
      }

      const existingDesc = currentTask.description || currentTask.markdown_description || "";
      // Strip any previous revision banner if present
      const cleanDesc = existingDesc.replace(
        /^>\s*⚠️\s*\*\*Revision Requested by[^\n]+\n(?:>\s*\*\*Reason:\*\*[^\n]+\n+)?/i,
        ""
      );
      const updatedDescription = alertPrefix + cleanDesc;

      await fetch(`${CLICKUP_API_BASE}/task/${taskId}`, {
        method: "PUT",
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: workflowStatuses.revisionRequested,
          description: updatedDescription,
          markdown_description: updatedDescription,
        }),
      });
    }

    const commentMsg = `⚠️ **Revision Requested by ${roleLabel} (${approverName})**\n\n**Reason:** ${revisionReason}\n\n*Requestor has been notified to edit and resubmit.*`;
    await postTaskComment(taskId, commentMsg);
    return true;
  } catch (err) {
    console.error(`Error requesting revision for task ${taskId}:`, err);
    return false;
  }
}
