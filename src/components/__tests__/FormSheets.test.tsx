import React, { useState } from "react";
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { RfpSheet } from "@/components/RfpSheet";
import { TravelBudgetSheet } from "@/components/TravelBudgetSheet";
import type { RfpFormData } from "@/types/rfp";

const initialRfp: RfpFormData = {
  date: "09/15/2026", payee: "", department: "", items: [{ id: "1", description: "", qty: "", unit: "pcs", unitPrice: "", amount: 0 }],
  totalAmount: 0, purpose: "", bank: "", accountName: "", accountNumber: "", paymentMethod: "", requestedByName: "", requestedByEmail: "",
  signatureType: "none", requestedByRemarks: "", urgency: "", dateNeeded: "",
};

function RfpHarness({ variant }: { variant: "prime" | "gw" }) {
  const [data, setData] = useState(initialRfp);
  return <><RfpSheet variant={variant} data={data} onChange={setData} /><output data-testid="state">{JSON.stringify(data)}</output></>;
}

describe.each(["prime", "gw"] as const)("%s RFP", (variant) => {
  it("keeps text and paired fields editable, and calculates a decimal unit price", () => {
    const { container } = render(<RfpHarness variant={variant} />);
    fireEvent.change(container.querySelector<HTMLInputElement>("#rfp-field-payee")!, { target: { value: "Vendor ABC" } });
    expect(container.querySelector<HTMLInputElement>("#rfp-field-payee")).toHaveValue("Vendor ABC");
    const department = [...container.querySelectorAll<HTMLInputElement>('input[type="text"]')].find((input) => input.value === "" && input.parentElement?.textContent?.includes("Department / Cost Center:"));
    fireEvent.change(department!, { target: { value: "Operations" } });
    const price = container.querySelector<HTMLInputElement>('input[inputmode="decimal"]')!;
    fireEvent.change(price, { target: { value: "1." } });
    expect(price).toHaveValue("1.");
    fireEvent.change(price, { target: { value: "1.25" } });
    fireEvent.change(container.querySelector<HTMLInputElement>('input[type="number"]')!, { target: { value: "2" } });
    const state = JSON.parse(screen.getByTestId("state").textContent || "{}");
    expect(state).toMatchObject({ payee: "Vendor ABC", vendor: "Vendor ABC", department: "Operations", departmentCostCenter: "Operations", totalAmount: 2.5 });
  });

  it("accepts native dates and keeps both synchronized values", () => {
    render(<RfpHarness variant={variant} />);
    fireEvent.change(screen.getByLabelText("Choose Due Date date"), { target: { value: "2026-10-25" } });
    fireEvent.change(screen.getByLabelText("Choose Date Accomplished date"), { target: { value: "2026-10-01" } });
    const state = JSON.parse(screen.getByTestId("state").textContent || "{}");
    expect(state).toMatchObject({ dueDate: "10/25/2026", dateNeeded: "10/25/2026", dateAccomplished: "10/01/2026", date: "10/01/2026" });
  });

  it("keeps time, purpose, bank details, and supporting-document checks editable", () => {
    const { container } = render(<RfpHarness variant={variant} />);
    fireEvent.change(container.querySelector<HTMLInputElement>('input[type="time"]')!, { target: { value: "14:35" } });
    fireEvent.change(container.querySelector<HTMLTextAreaElement>("#rfp-field-purpose")!, { target: { value: "Supplier payment" } });
    const bank = [...container.querySelectorAll<HTMLInputElement>('input[type="text"]')].find((input) => input.parentElement?.textContent?.includes("Bank:"));
    fireEvent.change(bank!, { target: { value: "BDO" } });
    fireEvent.click(screen.getByRole("checkbox", { name: "Invoice / Billing Statement" }));
    expect(JSON.parse(screen.getByTestId("state").textContent || "{}")).toMatchObject({ time: "2:35 PM", purpose: "Supplier payment", bank: "BDO", attachedDocs: { invoiceBilling: true } });
  });

  it("keeps finance-only inputs and checkboxes locked", () => {
    const { container } = render(<RfpHarness variant={variant} />);
    const finance = container.querySelector("fieldset")!;
    expect(within(finance).getByPlaceholderText("Task ID")).toBeDisabled();
    const checklist = finance.querySelector('[role="checkbox"]')!;
    fireEvent.click(checklist);
    expect(JSON.parse(screen.getByTestId("state").textContent || "{}").financeAccomplishedChecklist).toBeUndefined();
  });
});

function TravelHarness() {
  const [data, setData] = useState<Record<string, unknown>>({});
  return <><TravelBudgetSheet data={data} onChange={setData} /><output data-testid="state">{JSON.stringify(data)}</output></>;
}

describe("Travel Budget form", () => {
  it("keeps employee, travel, budget, and approval fields editable", () => {
    render(<TravelHarness />);
    for (const [name, value] of [["employeeName", "Jane Doe"], ["destination", "Cebu"], ["estimated_Airfare", "12500"], ["Requested by_name", "Jane Doe"]]) {
      fireEvent.change(screen.getByLabelText(name), { target: { value } });
      expect(screen.getByLabelText(name)).toHaveValue(value);
    }
    fireEvent.change(screen.getByPlaceholderText(/Business purpose/), { target: { value: "Client meeting" } });
    fireEvent.click(screen.getByLabelText("Air"));
    const state = JSON.parse(screen.getByTestId("state").textContent || "{}");
    expect(state).toMatchObject({ employeeName: "Jane Doe", destination: "Cebu", estimated_Airfare: "12500", businessJustification: "Client meeting", air: true });
  });

  it("stores chosen travel and approval dates in MM/DD/YYYY", () => {
    render(<TravelHarness />);
    const pickers = screen.getAllByTitle("Open Date Picker") as HTMLInputElement[];
    fireEvent.change(pickers[0], { target: { value: "2026-10-01" } });
    fireEvent.change(pickers[1], { target: { value: "2026-10-08" } });
    fireEvent.change(screen.getByLabelText("Choose Requested by approval date"), { target: { value: "2026-09-20" } });
    expect(JSON.parse(screen.getByTestId("state").textContent || "{}")).toMatchObject({ requestDate: "10/01/2026", departureDate: "10/08/2026", "Requested by_date": "09/20/2026" });
  });

  it("accepts travel details and all budget amounts", () => {
    render(<TravelHarness />);
    for (const [name, value] of [["projectName", "Annual meeting"], ["purposeTravel", "Client visit"], ["travelDays", "3"], ["travelers", "2"], ["approved_Airfare", "12000"], ["actual_Airfare", "11850"], ["total_estimated", "12500"], ["total_approved", "12000"], ["total_actual", "11850"], ["Finance Approver_name", "Alex"]]) {
      fireEvent.change(screen.getByLabelText(name), { target: { value } });
      expect(screen.getByLabelText(name)).toHaveValue(value);
    }
    fireEvent.click(screen.getByLabelText("Flight Quotation"));
    const state = JSON.parse(screen.getByTestId("state").textContent || "{}");
    expect(state).toMatchObject({ projectName: "Annual meeting", purposeTravel: "Client visit", approved_Airfare: "12000", flightQuotation: true });
  });
});
