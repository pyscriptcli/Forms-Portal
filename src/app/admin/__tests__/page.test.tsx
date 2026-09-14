import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// Fix: don't reference outer let-vars inside vi.mock factory (they're hoisted).
// Use vi.fn() directly in factory; grab references via the module mock after import.
vi.mock("@/lib/adminSettings", () => ({
  validateAdminCredentials: (email: string, pw: string) =>
    email === "admin@primephilippines.com" && pw === "admin",
  isAdminAuthenticated: vi.fn(() => false),
  setAdminSession: vi.fn(),
  clearAdminSession: vi.fn(),
  saveAdminSettings: vi.fn(),
  getAdminSettings: vi.fn(() => ({ portalGuideEnabled: true, rfpAutofillEnabled: true })),
  ADMIN_TOKEN: "prime-admin-token-v1",
}));

import AdminPage from "@/app/admin/page";
import * as adminSettings from "@/lib/adminSettings";

describe("Admin page — auth gate", () => {
  beforeEach(() => {
    vi.mocked(adminSettings.isAdminAuthenticated).mockReturnValue(false);
    vi.mocked(adminSettings.setAdminSession).mockClear();
    vi.mocked(adminSettings.clearAdminSession).mockClear();
    vi.mocked(adminSettings.saveAdminSettings).mockClear();
    // Default GET settings mock
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ portalGuideEnabled: true, rfpAutofillEnabled: true }),
    } as Response);
  });

  it("shows login form when not authenticated", () => {
    render(<AdminPage />);
    expect(screen.getByLabelText(/^Email$/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("shows error message on wrong credentials", async () => {
    render(<AdminPage />);
    await userEvent.type(screen.getByLabelText(/^Email$/i), "wrong@example.com");
    await userEvent.type(screen.getByLabelText(/^Password$/i), "badpass");
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/invalid credentials/i);
  });

  it("does NOT advance to dashboard on wrong credentials", async () => {
    render(<AdminPage />);
    await userEvent.type(screen.getByLabelText(/^Email$/i), "wrong@example.com");
    await userEvent.type(screen.getByLabelText(/^Password$/i), "badpass");
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
    expect(screen.queryByText(/Feature Controls/i)).not.toBeInTheDocument();
  });

  it("calls setAdminSession and shows dashboard on correct credentials", async () => {
    render(<AdminPage />);
    await userEvent.type(screen.getByLabelText(/^Email$/i), "admin@primephilippines.com");
    await userEvent.type(screen.getByLabelText(/^Password$/i), "admin");
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(adminSettings.setAdminSession).toHaveBeenCalled();
    expect(await screen.findByText(/Feature Controls/i)).toBeInTheDocument();
  });
});

describe("Admin page — toggles (authenticated)", () => {
  beforeEach(() => {
    vi.mocked(adminSettings.isAdminAuthenticated).mockReturnValue(true);
    vi.mocked(adminSettings.saveAdminSettings).mockClear();
  });

  it("renders Portal Guide and RFP Autofill toggles", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ portalGuideEnabled: true, rfpAutofillEnabled: true }),
    } as Response);

    render(<AdminPage />);
    await waitFor(() => screen.getByRole("heading", { name: "Portal Guide" }));

    expect(screen.getByRole("heading", { name: "Portal Guide" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "RFP AI Autofill" })).toBeInTheDocument();
  });

  it("fires POST to /api/admin/settings when Portal Guide is toggled off", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ portalGuideEnabled: true, rfpAutofillEnabled: true }),
    } as Response);

    render(<AdminPage />);
    await waitFor(() => screen.getByLabelText(/Toggle Portal Guide/i));

    fireEvent.click(screen.getByLabelText(/Toggle Portal Guide/i));

    await waitFor(() => {
      const postCall = fetchSpy.mock.calls.find(
        (c) => c[0] === "/api/admin/settings" && (c[1] as RequestInit)?.method === "POST"
      );
      expect(postCall).toBeDefined();
      const body = JSON.parse((postCall![1] as RequestInit).body as string);
      expect(body.portalGuideEnabled).toBe(false);
    });
  });

  it("fires POST to /api/admin/settings when RFP Autofill is toggled off", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ portalGuideEnabled: true, rfpAutofillEnabled: true }),
    } as Response);

    render(<AdminPage />);
    await waitFor(() => screen.getByLabelText(/Toggle RFP AI Autofill/i));

    fireEvent.click(screen.getByLabelText(/Toggle RFP AI Autofill/i));

    await waitFor(() => {
      const postCall = fetchSpy.mock.calls.find(
        (c) => c[0] === "/api/admin/settings" && (c[1] as RequestInit)?.method === "POST"
      );
      expect(postCall).toBeDefined();
      const body = JSON.parse((postCall![1] as RequestInit).body as string);
      expect(body.rfpAutofillEnabled).toBe(false);
    });
  });
});
