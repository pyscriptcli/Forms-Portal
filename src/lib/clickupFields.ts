import type { WorkflowStatuses } from "./adminSettings";
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

export const CLICKUP_MILESTONE_FIELDS: Record<RfpMilestoneKey, string> = {
  requestorFormSubmission: "RFP TS - Requestor Form Submission",
  tlReviewAndApproval: "RFP TS - TL Review and Approval",
  financeValidation: "RFP TS - Finance Validation",
  financeProcessing: "RFP TS - Finance Processing",
  paymentPreparation: "RFP TS - Payment Preparation",
  managementApproval: "RFP TS - CFO CEO Sign-Off",
  paymentRelease: "RFP TS - Payment Release",
  paymentDocumentation: "RFP TS - Payment Documentation",
  recordsFiling: "RFP TS - Records Filing",
  revisionRequested: "RFP Revision Requested At",
};

export const CLICKUP_AUDIT_FIELDS = {
  processHistory: "RFP Process History",
  lastStatusEventId: "RFP Last Status Event ID",
  revisionRequestedAt: "RFP Revision Requested At",
  revisionRequestedBy: "RFP Revision Requested By",
} as const;

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
  for (const [key, name] of Object.entries(CLICKUP_METADATA_FIELDS)) {
    const id = findMatch(name);
    if (id) mapping[name] = id;
  }

  // 2. Milestone timestamp fields
  for (const name of Object.values(CLICKUP_MILESTONE_FIELDS)) {
    const id = findMatch(name);
    if (id) mapping[name] = id;
  }

  // 3. Audit fields
  for (const name of Object.values(CLICKUP_AUDIT_FIELDS)) {
    const id = findMatch(name);
    if (id) mapping[name] = id;
  }

  return mapping;
}

/**
 * Validates which contract fields are mapped vs missing
 */
export function validateFieldMapping(mapping: ClickUpFieldIdMapping) {
  const allExpectedFields = [
    ...Object.values(CLICKUP_METADATA_FIELDS),
    ...Object.values(CLICKUP_MILESTONE_FIELDS),
    ...Object.values(CLICKUP_AUDIT_FIELDS),
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
