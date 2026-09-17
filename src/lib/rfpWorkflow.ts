import type { WorkflowStatuses } from "@/lib/adminSettings";

export const RFP_STAGES = [
  { key: "submission", label: "Submission", milestoneKeys: ["requestorFormSubmission"] },
  { key: "tlApproval", label: "TL Approval", milestoneKeys: ["tlReviewAndApproval"] },
  { key: "finance", label: "Finance", milestoneKeys: ["financeValidation", "financeProcessing", "paymentPreparation"] },
  { key: "managementApproval", label: "Management Approval", milestoneKeys: ["managementApproval"] },
  { key: "payment", label: "Payment", milestoneKeys: ["paymentRelease", "paymentDocumentation"] },
  { key: "completed", label: "Completed", milestoneKeys: ["recordsFiling"] },
] as const;

export type RfpMilestoneKey = keyof WorkflowStatuses;

export const ORDERED_MILESTONE_KEYS: RfpMilestoneKey[] = [
  "requestorFormSubmission",
  "tlReviewAndApproval",
  "financeValidation",
  "financeProcessing",
  "paymentPreparation",
  "managementApproval",
  "paymentRelease",
  "paymentDocumentation",
  "recordsFiling",
];

export function getMilestoneEntries(statuses: WorkflowStatuses) {
  return RFP_STAGES.flatMap((stage) => stage.milestoneKeys.map((key) => ({
    key,
    stageKey: stage.key,
    stageLabel: stage.label,
    status: statuses[key],
  })));
}

import { DEFAULT_WORKFLOW_STATUSES } from "./adminSettings";

export function resolveRfpMilestone(status: string, statuses: WorkflowStatuses) {
  const norm = (s: string) => (s || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, " ");
  const normalized = norm(status);
  const entries = getMilestoneEntries(statuses);

  // 1. Exact normalized match against configured statuses
  let found = entries.find((entry) => norm(entry.status) === normalized);

  // 2. Exact normalized match against default statuses as fallback
  if (!found) {
    const defaultEntries = getMilestoneEntries(DEFAULT_WORKFLOW_STATUSES);
    found = defaultEntries.find((entry) => norm(entry.status) === normalized);
  }

  // 3. Substring match (e.g. status contains "tl review" or "finance validation")
  if (!found && normalized) {
    found = entries.find(
      (entry) => norm(entry.status).includes(normalized) || normalized.includes(norm(entry.status))
    );
  }

  if (found) return { ...found, stageIndex: RFP_STAGES.findIndex((stage) => stage.key === found.stageKey) };
  return { key: "requestorFormSubmission" as const, stageKey: "submission", stageLabel: "Submission", status, stageIndex: 0 };
}
