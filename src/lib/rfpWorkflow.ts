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

export function getMilestoneEntries(statuses: WorkflowStatuses) {
  return RFP_STAGES.flatMap((stage) => stage.milestoneKeys.map((key) => ({
    key,
    stageKey: stage.key,
    stageLabel: stage.label,
    status: statuses[key],
  })));
}

export function resolveRfpMilestone(status: string, statuses: WorkflowStatuses) {
  const normalized = status.trim().toLowerCase();
  const entries = getMilestoneEntries(statuses);
  const found = entries.find((entry) => entry.status.trim().toLowerCase() === normalized);
  if (found) return { ...found, stageIndex: RFP_STAGES.findIndex((stage) => stage.key === found.stageKey) };
  return { key: "requestorFormSubmission" as const, stageKey: "submission", stageLabel: "Submission", status, stageIndex: 0 };
}
