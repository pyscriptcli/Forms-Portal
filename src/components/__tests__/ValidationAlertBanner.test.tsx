import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { ValidationAlertBanner } from "@/components/ValidationAlertBanner";

describe("ValidationAlertBanner", () => {
  it("renders red styling, tags, and directive when errors exist", () => {
    const items = [
      { id: "field-payee", label: "Payee / Supplier Name", message: "Payee is required" },
      { id: "field-date", label: "Date", message: "Date is required" },
      { id: "field-department", label: "Department", message: "Department is required" },
    ];

    const mockDismiss = vi.fn();

    render(
      <ValidationAlertBanner
        items={items}
        onDismiss={mockDismiss}
      />
    );

    // Banner heading & message
    expect(screen.getByText(/Required Information Missing/i)).toBeInTheDocument();
    expect(screen.getByText(/3 fields missed/i)).toBeInTheDocument();

    // Directive instruction box
    expect(screen.getByText(/Directive:/i)).toBeInTheDocument();
    expect(
      screen.getByText(/To complete your submission, fill in each required item highlighted in/i)
    ).toBeInTheDocument();

    // Red tag items
    const payeeTag = screen.getByRole("button", { name: /Payee \/ Supplier Name/i });
    expect(payeeTag).toBeInTheDocument();
    expect(payeeTag.className).toContain("text-red-800");

    // Red fix button
    const fixButton = screen.getByRole("button", { name: /Fix First Field/i });
    expect(fixButton).toBeInTheDocument();
    expect(fixButton.className).toContain("bg-red-600");

    // Dismiss button
    const dismissButton = screen.getByTitle(/Dismiss warning/i);
    fireEvent.click(dismissButton);
    expect(mockDismiss).toHaveBeenCalledTimes(1);
  });

  it("returns null when no errors exist", () => {
    const { container } = render(
      <ValidationAlertBanner
        items={[]}
        onDismiss={() => {}}
      />
    );
    expect(container.firstChild).toBeNull();
  });
});