import React, { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { PrototypeRoleSwitcher } from "@/components/PrototypeRoleSwitcher";
import { RfpSheet } from "@/components/RfpSheet";
import { RfpFormData } from "@/types/rfp";

const mockFormData: RfpFormData = {
  date: "09/17/2026",
  time: "10:00 AM",
  payee: "Acme Corp",
  department: "ISD",
  items: [
    { id: "1", description: "Item 1", qty: 1, unit: "pcs", unitPrice: 100, amount: 100 },
  ],
  totalAmount: 100,
  purpose: "Test purpose",
  bank: "BDO",
  accountName: "Acme",
  accountNumber: "12345",
  paymentMethod: "online",
  requestedByName: "Staff Member",
  requestedByEmail: "staff@example.com",
  signatureType: "none",
  requestedByRemarks: "",
};

describe("PrototypeRoleSwitcher and RfpSheet TL/Approver Overlay", () => {
  it("renders role buttons and allows switching roles", () => {
    const onRoleChange = vi.fn();
    render(
      <PrototypeRoleSwitcher
        currentRole="requestor"
        onRoleChange={onRoleChange}
        assignedApproverName="Maria Santos"
        assignedApproverEmail="tl.lead@primephilippines.com"
        department="ISD"
      />
    );

    expect(screen.getByText("Requestor View")).toBeDefined();
    expect(screen.getByText("Approver View (TL)")).toBeDefined();
    expect(screen.getByText("Finance View (ClickUp Only)")).toBeDefined();

    // Click approver view
    fireEvent.click(screen.getByText("Approver View (TL)"));
    expect(onRoleChange).toHaveBeenCalledWith("approver");

    // Click finance view
    fireEvent.click(screen.getByText("Finance View (ClickUp Only)"));
    expect(onRoleChange).toHaveBeenCalledWith("finance");
    expect(screen.getByText("Finance View: Native ClickUp Workflow")).toBeDefined();
  });

  it("shows For TL / Approver Only overlay on RfpSheet when in requestor view", () => {
    const onSimulateApprover = vi.fn();
    render(
      <RfpSheet
        data={mockFormData}
        onChange={() => {}}
        userRole="requestor"
        onSimulateApprover={onSimulateApprover}
        rfpNumberStatus="ready"
      />
    );

    expect(screen.getByText("For TL / Approver Only")).toBeDefined();
    expect(
      screen.getByText(/This section is reserved for Department Team Leader endorsement/)
    ).toBeDefined();

    const simulateBtn = screen.getByText("Simulate Approver View");
    expect(simulateBtn).toBeDefined();
    fireEvent.click(simulateBtn);
    expect(onSimulateApprover).toHaveBeenCalled();
  });

  it("unlocks TL signature block when in approver view", () => {
    render(
      <RfpSheet
        data={mockFormData}
        onChange={() => {}}
        userRole="approver"
        rfpNumberStatus="ready"
      />
    );

    expect(screen.queryByText("For TL / Approver Only")).toBeNull();
    expect(screen.getByText("Approver Endorsement Mode (Unlocked)")).toBeDefined();
    expect(screen.getByText("Quick-fill TL info")).toBeDefined();
  });
});
