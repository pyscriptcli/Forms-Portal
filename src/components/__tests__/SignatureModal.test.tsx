import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { SignatureModal } from "@/components/SignatureModal";

vi.mock("@/components/PrimeDialog", () => ({
  PrimeDialog: ({ open, children }: { open: boolean; children: ReactNode }) =>
    open ? <div role="dialog">{children}</div> : null,
}));

describe("SignatureModal", () => {
  beforeEach(() => {
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      setTransform: vi.fn(),
      lineCap: "round",
      lineJoin: "round",
      strokeStyle: "#003366",
      lineWidth: 2.5,
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      clearRect: vi.fn(),
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, "getBoundingClientRect").mockReturnValue({
      width: 400,
      height: 176,
      top: 0,
      left: 0,
      right: 400,
      bottom: 176,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
  });

  it("keeps the Draw Signature tab active after it is clicked", () => {
    render(<SignatureModal isOpen onClose={vi.fn()} onSave={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /draw signature/i }));

    expect(screen.getByLabelText("Draw your signature")).toBeInTheDocument();
    expect(screen.queryByText(/click to select signature image/i)).not.toBeInTheDocument();
  });
});
