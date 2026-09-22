import { describe, it, expect } from "vitest";
import {
  formatMilestoneTimestamp,
  mapClickUpTaskToTrackedRfp,
} from "../rfpTrackerMapping";

describe("rfpTrackerMapping", () => {
  describe("formatMilestoneTimestamp", () => {
    it("formats unix millisecond timestamp in Asia/Manila timezone", () => {
      // 1726472580000 is 2024-09-16T07:43:00Z -> 15:43 Manila (3:43 PM)
      const formatted = formatMilestoneTimestamp(1726472580000);
      expect(formatted).toMatch(/Sep 16, 2024, 3:43\s*PM/i);
    });

    it("formats ISO string timestamp", () => {
      const formatted = formatMilestoneTimestamp("2026-09-16T01:30:00.000Z");
      // 01:30 UTC -> 09:30 AM Manila
      expect(formatted).toMatch(/Sep 16, 2026, 9:30\s*AM/i);
    });

    it("returns 'Timestamp unavailable' for invalid, empty, or null values", () => {
      expect(formatMilestoneTimestamp(null)).toBe("Timestamp unavailable");
      expect(formatMilestoneTimestamp(undefined)).toBe("Timestamp unavailable");
      expect(formatMilestoneTimestamp("")).toBe("Timestamp unavailable");
      expect(formatMilestoneTimestamp("invalid-date-string")).toBe("Timestamp unavailable");
    });
  });

  describe("mapClickUpTaskToTrackedRfp", () => {
    it("extracts metadata and milestone timestamps from ClickUp custom fields", () => {
      const mockTask = {
        id: "task-123",
        name: "[RFP-092026-0001] PRIME – Acmo Vendor – Office Supplies",
        status: { status: "finance processing" },
        date_created: "1726450000000",
        date_updated: "1726472580000",
        custom_fields: [
          { id: "f-id", name: "RFP ID", value: "RFP-092026-0001" },
          { id: "f-entity", name: "RFP Entity", value: "PRIME" },
          { id: "f-dept", name: "RFP Department", value: "Accounting" },
          { id: "f-amount", name: "RFP Amount", value: "25000.50" },
          { id: "f-purpose", name: "RFP Purpose", value: "Quarterly supplies procurement" },
          { id: "f-req-name", name: "RFP Requestor Name", value: "Jane Doe" },
          { id: "f-req-email", name: "RFP Requestor Email", value: "jane@primephilippines.com" },
          { id: "f-app-name", name: "RFP Approver Name", value: "John Approver" },
          { id: "f-app-email", name: "RFP Approver Email", value: "john@primephilippines.com" },
          { id: "f-submission-ts", name: "TS RFP - Requestor Form Submission", value: "1726472580000" },
          { id: "f-tl-ts", name: "TS RFP - TL Review and Approval", value: "1726472580000" },
          { id: "f-validation-ts", name: "TS RFP - Finance Validation", value: "1726472580000" },
          { id: "f-processing-ts", name: "TS RFP - Finance Processing", value: "1726472580000" },
          { id: "f-history", name: "RFP Process History", value: "[2024-09-16T07:43:00.000Z] Finance User: \"FINANCE VALIDATION\" -> \"FINANCE PROCESSING\" (Event: event-1)" },
        ],
        url: "https://app.clickup.com/t/task-123",
        team_id: "9014981136",
      };

      const result = mapClickUpTaskToTrackedRfp(mockTask);

      expect(result.taskId).toBe("task-123");
      expect(result.requestId).toBe("RFP-092026-0001");
      expect(result.payee).toBe("Acmo Vendor");
      expect(result.department).toBe("Accounting");
      expect(result.totalAmount).toBe(25000.5);
      expect(result.purpose).toBe("Quarterly supplies procurement");
      expect(result.requestedBy).toBe("Jane Doe");
      expect(result.requestedByEmail).toBe("jane@primephilippines.com");
      expect(result.approverName).toBe("John Approver");
      expect(result.currentStage).toBe("finance_verification");
      expect(result.currentMilestone).toMatch(/FINANCE PROCESSING/i);
      expect(result.milestoneTimestamps.requestorFormSubmission).toBeTruthy();
      expect(result.milestoneTimestamps.tlReviewAndApproval).toBeTruthy();
      expect(result.milestoneTimestamps.financeValidation).toBeTruthy();
      expect(result.milestoneTimestamps.financeProcessing).toMatch(/Sep 16, 2024, 3:43\s*PM/i);
      expect(result.milestoneActors.financeProcessing).toBe("Finance User");
      expect(result.milestoneTimestamps.recordsFiling).toBeUndefined();

      // Privacy scrubbing: raw clickup URL or sensitive internal metadata not on result
      expect((result as any).url).toBeUndefined();
      expect((result as any).team_id).toBeUndefined();
    });

    it("falls back gracefully to description parsing when custom fields are empty", () => {
      const mockTask = {
        id: "task-legacy",
        name: "[RFP-092026-0002] Supplier Co",
        status: { status: "tl review and approval" },
        date_created: "1726450000000",
        description: `
          **Request Details**
          - Entity: PRIME
          - Department: Marketing
          - Payee: Supplier Co
          - Total Amount: ₱12,500.00
          - Purpose: Event banner printing
          - Requestor: Mark Spencer
        `,
        custom_fields: [],
      };

      const result = mapClickUpTaskToTrackedRfp(mockTask);

      expect(result.taskId).toBe("task-legacy");
      expect(result.requestId).toBe("RFP-092026-0002");
      expect(result.department).toBe("Marketing");
      expect(result.totalAmount).toBe(12500);
      expect(result.purpose).toBe("Event banner printing");
      expect(result.requestedBy).toBe("Mark Spencer");
      expect(result.dataSource).toBe("legacy_fallback");
    });

    it("does not infer milestone timestamps from task date_updated", () => {
      const mockTask = {
        id: "task-missing-ts",
        name: "[RFP-092026-0004] PRIME – Bestprints – Quotation printing",
        status: { status: "finance validation" },
        date_created: "1789547820000",
        date_updated: "1789547880000",
        custom_fields: [],
      };

      const result = mapClickUpTaskToTrackedRfp(mockTask);

      expect(result.milestoneTimestamps.requestorFormSubmission).toBeUndefined();
      expect(result.milestoneTimestamps.tlReviewAndApproval).toBeUndefined();
      expect(result.milestoneTimestamps.financeValidation).toBeUndefined();
      // Unreached milestones remain undefined (UI renders Pending)
      expect(result.milestoneTimestamps.financeProcessing).toBeUndefined();
    });

    it("maps the ClickUp revision reason, timestamp, actor, and prior workflow stage", () => {
      const result = mapClickUpTaskToTrackedRfp({
        id: "task-revision",
        name: "[RFP-092026-0005] PRIME – Supplier – Supplies",
        status: { status: "REVISION REQUESTED" },
        date_created: "1789547820000",
        custom_fields: [
          { id: "revision-reason", name: "RFP Revision Reason", value: "Attach the signed quotation." },
          { id: "revision-at", name: "RFP Revision Requested At", value: "1789617000000" },
          { id: "revision-by", name: "RFP Revision Requested By", value: "Finance User" },
          { id: "history", name: "RFP Process History", value: "[2026-09-16T01:20:00.000Z] Finance User: \"FINANCE VALIDATION\" -> \"REVISION REQUESTED\" (Event: event-2)" },
        ],
      });

      expect(result.isRevisionRequested).toBe(true);
      expect(result.currentStage).toBe("revision_requested");
      expect(result.stageIndex).toBe(2);
      expect(result.revisionReason).toBe("Attach the signed quotation.");
      expect(result.revisionRequestedAt).toMatch(/Sep 17, 2026/i);
      expect(result.revisionRequestedBy).toBe("Finance User");
    });
  });
});
