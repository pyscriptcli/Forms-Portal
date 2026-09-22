import type { RfpMilestoneKey } from "./rfpWorkflow";

/**
 * ClickUp Custom Fields Contract for PRIME Forms Portal RFP Tracking
 */

export const CLICKUP_METADATA_FIELDS = {
  requestId: "RFP ID",
  entityCode: "RFP Entity",
  department: "RFP Department",
  totalAmount: "RFP Amount",
  purpose: "RFP Purpose",
  requestedBy: "RFP Requestor Name",
  requestedByEmail: "RFP Requestor Email",
  approverName: "RFP Approver Name",
  approverEmail: "RFP Approver Email",
} as const;

export type MetadataFieldKey = keyof typeof CLICKUP_METADATA_FIELDS;

export const CLICKUP_AUDIT_FIELDS = {
  processHistory: "RFP Process History",
  lastStatusEventId: "RFP Last Status Event ID",
  revisionRequestedAt: "RFP Revision Requested At",
  revisionRequestedBy: "RFP Revision Requested By",
  revisionReason: "RFP Revision Reason",
} as const;

/**
 * Timestamp fields populated from ClickUp status-change activity.
 * The TS RFP naming matches the fields configured on the RFP List.
 */
export const CLICKUP_MILESTONE_FIELDS: Record<Exclude<RfpMilestoneKey, "revisionRequested">, string> = {
  requestorFormSubmission: "TS RFP - Requestor Form Submission",
  tlReviewAndApproval: "TS RFP - TL Review and Approval",
  financeValidation: "TS RFP - Finance Validation",
  financeProcessing: "TS RFP - Finance Processing",
  paymentPreparation: "TS RFP - Payment Preparation",
  managementApproval: "TS RFP - CFO/CEO Sign-Off",
  paymentRelease: "TS RFP - Payment Release",
  paymentDocumentation: "TS RFP - Payment Documentation",
  recordsFiling: "TS RFP - Records Filing",
};

/** Text companion fields populated with the ClickUp user who entered each status. */
export const CLICKUP_MILESTONE_ACTOR_FIELDS: Record<Exclude<RfpMilestoneKey, "revisionRequested">, string> = {
  requestorFormSubmission: "BY RFP - Requestor Form Submission",
  tlReviewAndApproval: "BY RFP - TL Review and Approval",
  financeValidation: "BY RFP - Finance Validation",
  financeProcessing: "BY RFP - Finance Processing",
  paymentPreparation: "BY RFP - Payment Preparation",
  managementApproval: "BY RFP - CFO/CEO Sign-Off",
  paymentRelease: "BY RFP - Payment Release",
  paymentDocumentation: "BY RFP - Payment Documentation",
  recordsFiling: "BY RFP - Records Filing",
};

const LEGACY_MILESTONE_FIELD_NAMES: Record<string, string> = {
  "RFP TS - Requestor Form Submission": CLICKUP_MILESTONE_FIELDS.requestorFormSubmission,
  "RFP TS - TL Review and Approval": CLICKUP_MILESTONE_FIELDS.tlReviewAndApproval,
  "RFP TS - Finance Validation": CLICKUP_MILESTONE_FIELDS.financeValidation,
  "RFP TS - Finance Processing": CLICKUP_MILESTONE_FIELDS.financeProcessing,
  "RFP TS - Payment Preparation": CLICKUP_MILESTONE_FIELDS.paymentPreparation,
  "RFP TS - CFO CEO Sign-Off": CLICKUP_MILESTONE_FIELDS.managementApproval,
  "RFP TS - Payment Release": CLICKUP_MILESTONE_FIELDS.paymentRelease,
  "RFP TS - Payment Documentation": CLICKUP_MILESTONE_FIELDS.paymentDocumentation,
  "RFP TS - Records Filing": CLICKUP_MILESTONE_FIELDS.recordsFiling,
};

export type AuditFieldKey = keyof typeof CLICKUP_AUDIT_FIELDS;

export interface ClickUpFieldDefinition {
  id: string;
  name: string;
  type: string;
  type_config?: Record<string, unknown>;
}

export type ClickUpFieldIdMapping = Record<string, string>;

export function normalizeFieldName(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ");
}

/**
 * Resolves ClickUp custom field definitions against canonical names to produce a runtime field ID mapping.
 */
export function resolveFieldIdMapping(availableFields: ClickUpFieldDefinition[]): ClickUpFieldIdMapping {
  const mapping: ClickUpFieldIdMapping = {};
  const normalizedAvailable = availableFields.map((field) => ({
    field,
    norm: normalizeFieldName(field.name),
  }));

  // Helper to find match
  const findMatch = (canonicalName: string) => {
    const targetNorm = normalizeFieldName(canonicalName);
    const exact = normalizedAvailable.find((item) => item.norm === targetNorm);
    if (exact) return exact.field.id;
    // Fallback fuzzy
    const fuzzy = normalizedAvailable.find((item) => item.norm.includes(targetNorm) || targetNorm.includes(item.norm));
    return fuzzy?.field.id;
  };

  // 1. Metadata fields
  for (const name of Object.values(CLICKUP_METADATA_FIELDS)) {
    const id = findMatch(name);
    if (id) mapping[name] = id;
  }

  // 2. Audit fields
  for (const name of Object.values(CLICKUP_AUDIT_FIELDS)) {
    const id = findMatch(name);
    if (id) mapping[name] = id;
  }

  // 3. Milestone timestamp fields. Support the earlier RFP TS naming as a
  // read-only compatibility alias while preferring the configured TS RFP name.
  for (const name of Object.values(CLICKUP_MILESTONE_FIELDS)) {
    const id = findMatch(name);
    if (id) mapping[name] = id;
  }
  for (const name of Object.values(CLICKUP_MILESTONE_ACTOR_FIELDS)) {
    const id = findMatch(name);
    if (id) mapping[name] = id;
  }
  for (const [legacyName, canonicalName] of Object.entries(LEGACY_MILESTONE_FIELD_NAMES)) {
    const id = findMatch(legacyName);
    if (id && !mapping[canonicalName]) mapping[canonicalName] = id;
  }

  return mapping;
}

/**
 * Validates which contract fields are mapped vs missing
 */
export function validateFieldMapping(mapping: ClickUpFieldIdMapping) {
  const allExpectedFields = [
    ...Object.values(CLICKUP_METADATA_FIELDS),
    ...Object.values(CLICKUP_AUDIT_FIELDS),
    ...Object.values(CLICKUP_MILESTONE_ACTOR_FIELDS),
  ];
  const uniqueExpected = Array.from(new Set(allExpectedFields));

  const mapped: Array<{ name: string; id: string }> = [];
  const missing: string[] = [];

  for (const name of uniqueExpected) {
    if (mapping[name]) {
      mapped.push({ name, id: mapping[name] });
    } else {
      missing.push(name);
    }
  }

  return {
    totalExpected: uniqueExpected.length,
    mappedCount: mapped.length,
    missingCount: missing.length,
    isComplete: missing.length === 0,
    mapped,
    missing,
  };
}

/**
 * Formats a value for writing to a ClickUp custom field
 */
export function formatCustomFieldValueForWrite(
  fieldType: string,
  value: unknown
): string | number | boolean | null {
  if (value === undefined || value === null) return null;

  const normType = (fieldType || "text").toLowerCase().trim();

  switch (normType) {
    case "money":
    case "currency":
    case "number": {
      const num = typeof value === "number" ? value : parseFloat(String(value).replace(/,/g, ""));
      return Number.isNaN(num) ? 0 : num;
    }

    case "date": {
      if (typeof value === "number") return Math.round(value);
      const num = Number(value);
      if (!Number.isNaN(num) && num > 1000000000) return Math.round(num);
      const date = new Date(String(value));
      return Number.isNaN(date.getTime()) ? null : date.getTime();
    }

    case "checkbox":
      return Boolean(value);

    case "string":
    case "text":
    case "short_text":
    case "url":
    case "email":
    default:
      return String(value).trim();
  }
}
