import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RequestsPage from "./page";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("id=task-1"),
}));

describe("request details", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        viewerCanViewAll: false,
        requests: [{
          taskId: "task-1",
          requestId: "RFP-092026-0001",
          taskName: "[RFP-092026-0001] PRIME – ABC Company – Tarpaulin",
          formType: "rfp",
          payee: "ABC Company",
          department: "Marketing",
          totalAmount: 15000,
          dateNeeded: "2026-09-30",
          urgency: "normal",
          purpose: "Tarpaulin installation",
          requestedBy: "Team Member",
          requestedByEmail: "member@primephilippines.com",
          approverName: "Team Lead",
          approverEmail: "lead@primephilippines.com",
          currentStage: "completed",
          stageLabel: "Completed",
          currentMilestone: "Records Filing",
          statusUpdatedAt: "2026-09-16T01:25:00.000Z",
          stageIndex: 5,
          isRevisionRequested: false,
          dateCreated: "2026-09-15T01:00:00.000Z",
          attachments: [],
          milestoneTimestamps: {
            requestorFormSubmission: "Sep 15, 2026, 9:00 AM",
            tlReviewAndApproval: "Sep 15, 2026, 11:30 AM",
            financeValidation: "Sep 16, 2026, 8:45 AM",
            financeProcessing: "Sep 16, 2026, 9:25 AM",
          },
        }],
      }),
    }));
  });

  it("presents Finance work as milestone states with exact milestone timestamps and no ClickUp link", async () => {
    render(<RequestsPage />);

    await waitFor(() => expect(screen.getByRole("region", { name: "Request details" })).toBeInTheDocument());
    expect(screen.getByText("Finance Validation")).toBeInTheDocument();
    expect(screen.getByText("Finance Processing")).toBeInTheDocument();
    expect(screen.getByText("Payment Preparation")).toBeInTheDocument();
    expect(screen.getByText("Sep 16, 2026, 8:45 AM")).toBeInTheDocument();
    expect(screen.getByText("Sep 16, 2026, 9:25 AM")).toBeInTheDocument();
    expect(screen.queryByText("Timestamp unavailable")).not.toBeInTheDocument();
    expect(screen.queryByText(/Open in ClickUp/i)).not.toBeInTheDocument();
    expect(screen.getAllByText("Tarpaulin installation").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "View status for ABC Company" })).toBeInTheDocument();
    expect(screen.getAllByText("Completed").length).toBeGreaterThan(0);
    expect(screen.getByText("Team Lead")).toBeInTheDocument();
  });
});
