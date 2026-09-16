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
          currentStage: "finance_verification",
          stageLabel: "Finance",
          currentMilestone: "Finance Processing",
          statusUpdatedAt: "2026-09-16T01:25:00.000Z",
          stageIndex: 2,
          isRevisionRequested: false,
          dateCreated: "2026-09-15T01:00:00.000Z",
          attachments: [],
        }],
      }),
    }));
  });

  it("presents Finance work as milestone states with an update timestamp and no ClickUp link", async () => {
    render(<RequestsPage />);

    await waitFor(() => expect(screen.getByRole("region", { name: "Request details" })).toBeInTheDocument());
    expect(screen.getByText("Validation")).toBeInTheDocument();
    expect(screen.getByText("Processing")).toBeInTheDocument();
    expect(screen.getByText("Payment Preparation")).toBeInTheDocument();
    expect(screen.getByText(/^Updated Sep 16, 2026/)).toBeInTheDocument();
    expect(screen.queryByText(/Open in ClickUp/i)).not.toBeInTheDocument();
    expect(screen.getAllByText("₱15,000.00").length).toBeGreaterThan(0);
  });
});
