import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SubmissionModal } from "@/components/SubmissionModal";

describe("SubmissionModal", () => {
  it("keeps ClickUp internal and sends the requestor to portal tracking", () => {
    HTMLDialogElement.prototype.showModal = vi.fn();
    HTMLDialogElement.prototype.close = vi.fn();
    render(<SubmissionModal
      isOpen
      onClose={() => undefined}
      response={{ success: true, taskId: "task-1", message: "Submitted", isMock: false }}
      pdfBlob={null}
      payeeName="ABC Company"
    />);

    expect(screen.queryByRole("link", { name: /view request/i, hidden: true })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /track status/i, hidden: true })).toHaveAttribute("href", "/track?id=task-1");
  });
});
