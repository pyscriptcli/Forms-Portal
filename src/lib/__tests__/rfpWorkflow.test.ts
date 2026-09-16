import { describe, expect, it } from "vitest";
import { DEFAULT_WORKFLOW_STATUSES } from "@/lib/adminSettings";
import { RFP_STAGES, resolveRfpMilestone } from "@/lib/rfpWorkflow";

describe("RFP workflow model", () => {
  it("groups nine ClickUp milestones into six portal stages", () => {
    expect(RFP_STAGES.map((stage) => stage.label)).toEqual([
      "Submission", "TL Approval", "Finance", "Management Approval", "Payment", "Completed",
    ]);
    expect(RFP_STAGES.flatMap((stage) => stage.milestoneKeys)).toHaveLength(9);
  });

  it("resolves Finance processing to the Finance stage", () => {
    expect(resolveRfpMilestone("Finance Processing", DEFAULT_WORKFLOW_STATUSES)).toMatchObject({
      key: "financeProcessing",
      stageKey: "finance",
      stageLabel: "Finance",
      stageIndex: 2,
    });
  });

  it("uses Submission as the safe fallback for unknown statuses", () => {
    expect(resolveRfpMilestone("unexpected legacy status", DEFAULT_WORKFLOW_STATUSES)).toMatchObject({
      key: "requestorFormSubmission",
      stageIndex: 0,
    });
  });
});
