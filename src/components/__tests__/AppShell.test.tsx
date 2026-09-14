import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/",
}));

// Mock next-auth
vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: null }),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

// Mock GlobalSearch and PrototypeTourModal to isolate AppShell
vi.mock("@/components/GlobalSearch", () => ({
  GlobalSearch: () => <div data-testid="global-search" />,
}));
vi.mock("@/components/PrototypeTourModal", () => ({
  PrototypeTourModal: () => <div data-testid="tour-modal" />,
}));

// Mock admin settings — default: guide enabled
vi.mock("@/lib/adminSettings", () => ({
  getAdminSettings: () => ({ portalGuideEnabled: true, rfpAutofillEnabled: true }),
}));

// Mock fetch for /api/admin/settings
beforeEach(() => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: true,
    json: async () => ({ portalGuideEnabled: true, rfpAutofillEnabled: true }),
  } as Response);
});

import { AppShell } from "@/components/AppShell";

describe("AppShell", () => {
  it("renders Requests nav link", () => {
    render(<AppShell><div>content</div></AppShell>);
    expect(screen.getByRole("link", { name: /requests/i })).toBeInTheDocument();
  });

  it("renders Approvals nav link", () => {
    render(<AppShell><div>content</div></AppShell>);
    expect(screen.getByRole("link", { name: /approvals/i })).toBeInTheDocument();
  });

  it("does NOT render a link to /admin in the sidebar", () => {
    render(<AppShell><div>content</div></AppShell>);
    const links = screen.getAllByRole("link");
    const adminLinks = links.filter((l) => l.getAttribute("href") === "/admin");
    expect(adminLinks).toHaveLength(0);
  });

  it("renders the global search", () => {
    render(<AppShell><div>content</div></AppShell>);
    expect(screen.getByTestId("global-search")).toBeInTheDocument();
  });

  it("mounts PrototypeTourModal when portalGuideEnabled is true", async () => {
    render(<AppShell><div>content</div></AppShell>);
    await waitFor(() => {
      expect(screen.getByTestId("tour-modal")).toBeInTheDocument();
    });
  });
});
