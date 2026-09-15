import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { PrimeDatePicker, formatToMMDDYYYY } from "@/components/PrimeDatePicker";

describe("formatToMMDDYYYY helper", () => {
  it("formats ISO date YYYY-MM-DD to MM/DD/YYYY", () => {
    expect(formatToMMDDYYYY("2026-09-15")).toBe("09/15/2026");
    expect(formatToMMDDYYYY("2026-1-5")).toBe("01/05/2026");
  });

  it("leaves already formatted MM/DD/YYYY unchanged", () => {
    expect(formatToMMDDYYYY("09/15/2026")).toBe("09/15/2026");
  });

  it("returns empty string for empty input", () => {
    expect(formatToMMDDYYYY("")).toBe("");
  });
});

describe("PrimeDatePicker component", () => {
  it("renders with formatted value and allows text change", () => {
    const onChange = vi.fn();
    render(<PrimeDatePicker value="2026-10-25" onChange={onChange} placeholder="MM/DD/YYYY" />);

    const input = screen.getByPlaceholderText("MM/DD/YYYY");
    expect(input).toHaveValue("10/25/2026");

    fireEvent.change(input, { target: { value: "11/01/2026" } });
    expect(onChange).toHaveBeenCalledWith("11/01/2026");
  });

  it("renders calendar trigger button", () => {
    render(<PrimeDatePicker value="" onChange={vi.fn()} />);
    expect(screen.getByTitle("Open Date Picker")).toHaveAttribute("type", "date");
  });

  it("accepts a date from the native picker and reports MM/DD/YYYY", () => {
    const onChange = vi.fn();
    render(<PrimeDatePicker value="" onChange={onChange} ariaLabel="Departure" />);
    fireEvent.change(screen.getByLabelText("Choose Departure date"), { target: { value: "2026-10-25" } });
    expect(onChange).toHaveBeenCalledWith("10/25/2026");
  });
});
