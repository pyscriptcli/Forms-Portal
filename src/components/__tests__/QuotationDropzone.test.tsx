import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { QuotationDropzone } from "@/components/QuotationDropzone";

describe("QuotationDropzone", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders upload button and auto-fill labels", () => {
    render(<QuotationDropzone onDataExtracted={vi.fn()} />);

    expect(screen.getByText(/RFP Auto-Fill/i)).toBeInTheDocument();
    expect(screen.getByText(/Upload Quote/i)).toBeInTheDocument();
  });

  it("handles HTTP 413 'Request Entity Too Large' gracefully without JSON syntax errors", async () => {
    // Mock fetch returning non-JSON plain text 413 response (like Vercel does)
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 413,
      text: async () => "Request Entity Too Large",
    } as any);

    render(<QuotationDropzone onDataExtracted={vi.fn()} />);

    // Trigger file upload with an image
    const file = new File(["dummy content"], "test-quote.png", { type: "image/png" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(
        screen.getByText(/Quotation file is too large/i)
      ).toBeInTheDocument();
    });

    // Verify error can be dismissed
    const dismissBtn = screen.getByLabelText(/Dismiss error/i);
    fireEvent.click(dismissBtn);

    expect(screen.queryByText(/Quotation file is too large/i)).not.toBeInTheDocument();
  });

  it("populates extracted data when API returns success", async () => {
    const mockOnExtracted = vi.fn();
    const mockData = {
      payee: "Acme Corp",
      totalAmount: 15000,
      items: [
        {
          id: "item-1",
          description: "Office Supplies",
          qty: 1,
          unit: "lot",
          unitPrice: 15000,
          amount: 15000,
        },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        success: true,
        source: "free_parser",
        data: mockData,
      }),
    } as any);

    render(<QuotationDropzone onDataExtracted={mockOnExtracted} />);

    const file = new File(["dummy content"], "quote.jpg", { type: "image/jpeg" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockOnExtracted).toHaveBeenCalledWith(mockData, file);
    });
  });
});
