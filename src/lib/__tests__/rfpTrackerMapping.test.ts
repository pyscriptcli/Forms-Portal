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
    it("extracts data from custom fields and milestone timestamps", () => {
      const mockTask = {
        id: "task-123",
        name: "[RFP-092026-0001] PRIME – Acmo Vendor – Office Supplies",
        status: { status: "finance processing" },
        date_created: "1726450000000",
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
          { id: "f-ts-sub", name: "RFP TS - Requestor Form Submission", value: 1726450000000 },
          { id: "f-ts-tl", name: "RFP TS - TL Review and Approval", value: 1726460000000 },
          { id: "f-ts-val", name: "RFP TS - Finance Validation", value: 1726470000000 },
          { id: "f-ts-proc", name: "RFP TS - Finance Processing", value: 1726472580000 },
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

    it("uses native ClickUp timestamp for reached milestones and queues pending backfill", () => {
      const mockTask = {
        id: "task-missing-ts",
        name: "[RFP-092026-0004] PRIME – Bestprints – Quotation printing",
        status: { status: "finance validation" },
        date_created: "1789547820000",
        date_updated: "1789547880000",
        custom_fields: [
          { id: "f-ts-sub", name: "RFP TS - Requestor Form Submission", value: 1789547820000 },
          { id: "f-ts-tl", name: "RFP TS - TL Review and Approval", value: null },
          { id: "f-ts-val", name: "RFP TS - Finance Validation", value: null },
        ],
      };

      const result = mapClickUpTaskToTrackedRfp(mockTask);

      expect(result.milestoneTimestamps.requestorFormSubmission).toBeTruthy();
      // Reached milestones display exact native update timestamp instead of unavailable
      expect(result.milestoneTimestamps.tlReviewAndApproval).toBeTruthy();
      expect(result.milestoneTimestamps.tlReviewAndApproval).not.toBe("Timestamp unavailable");
      expect(result.milestoneTimestamps.financeValidation).toBeTruthy();
      expect(result.milestoneTimestamps.financeValidation).not.toBe("Timestamp unavailable");
      // Unreached milestones remain undefined (UI renders Pending)
      expect(result.milestoneTimestamps.financeProcessing).toBeUndefined();
      // Queues backfill to ClickUp custom fields
      expect(result.pendingClickUpBackfill).toHaveLength(2);
      expect(result.pendingClickUpBackfill?.[0].fieldId).toBe("f-ts-tl");
      expect(result.pendingClickUpBackfill?.[1].fieldId).toBe("f-ts-val");
    });
  });
});
