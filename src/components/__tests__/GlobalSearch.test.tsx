import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

import { GlobalSearch } from "@/components/GlobalSearch";

const MOCK_RESULTS = [
  {
    taskId: "12345678",
    payee: "ACME Corp",
    formType: "rfp",
    currentStage: "submitted",
    department: "IT",
  },
  {
    taskId: "87654321",
    payee: "Beta Supplies",
    formType: "po",
    currentStage: "endorsed",
    department: "Procurement",
  },
];

describe("GlobalSearch", () => {
  beforeEach(() => {
    mockPush.mockClear();
    vi.restoreAllMocks();
  });

  it("renders a search input with aria-label", () => {
    render(<GlobalSearch />);
    expect(screen.getByRole("textbox", { name: /global search/i })).toBeInTheDocument();
  });

  it("calls the track API with the typed query", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, requests: MOCK_RESULTS }),
    } as Response);

    render(<GlobalSearch />);
    const input = screen.getByRole("textbox", { name: /global search/i });

    fireEvent.change(input, { target: { value: "ACME" } });

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining("query=ACME"));
    });
  });

  it("renders result items after successful fetch", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, requests: MOCK_RESULTS }),
    } as Response);

    render(<GlobalSearch />);
    const input = screen.getByRole("textbox", { name: /global search/i });

    fireEvent.change(input, { target: { value: "Corp" } });

    await waitFor(() => {
      expect(screen.getByText("ACME Corp")).toBeInTheDocument();
    });
  });

  it("navigates to approvals for 'submitted' stage requests", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, requests: [MOCK_RESULTS[0]] }),
    } as Response);

    render(<GlobalSearch />);
    const input = screen.getByRole("textbox", { name: /global search/i });
    fireEvent.change(input, { target: { value: "ACME" } });

    await waitFor(() => screen.getByText("ACME Corp"));
    fireEvent.click(screen.getByText("ACME Corp"));

    expect(mockPush).toHaveBeenCalledWith("/approvals?taskId=12345678");
  });

  it("navigates to track for non-approval stage requests", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, requests: [MOCK_RESULTS[1]] }),
    } as Response);

    render(<GlobalSearch />);
    const input = screen.getByRole("textbox", { name: /global search/i });
    fireEvent.change(input, { target: { value: "Beta" } });

    await waitFor(() => screen.getByText("Beta Supplies"));
    fireEvent.click(screen.getByText("Beta Supplies"));

    expect(mockPush).toHaveBeenCalledWith("/track?id=87654321");
  });

  it("closes dropdown and clears query on Escape", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, requests: MOCK_RESULTS }),
    } as Response);

    render(<GlobalSearch />);
    const input = screen.getByRole("textbox", { name: /global search/i });
    fireEvent.change(input, { target: { value: "Corp" } });

    await waitFor(() => screen.getByText("ACME Corp"));

    fireEvent.keyDown(input, { key: "Escape" });

    expect(screen.queryByText("ACME Corp")).not.toBeInTheDocument();
    expect((input as HTMLInputElement).value).toBe("");
  });
});
