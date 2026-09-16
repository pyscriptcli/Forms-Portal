import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PrimeDialog } from "@/components/PrimeDialog";

describe("PrimeDialog", () => {
  it("is excluded from browser printing and DOM-to-image PDF capture", () => {
    HTMLDialogElement.prototype.showModal = vi.fn();
    HTMLDialogElement.prototype.close = vi.fn();
    render(<PrimeDialog open title="Request submitted">Success</PrimeDialog>);

    const dialog = screen.getByRole("dialog", { hidden: true });
    expect(dialog).toHaveClass("no-print");
    expect(dialog).toHaveAttribute("data-pdf-ignore", "true");
  });
});
