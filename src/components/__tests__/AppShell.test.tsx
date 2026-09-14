import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import React from "react";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/requests",
}));

// Mock AuthProvider
vi.mock("@/components/AuthProvider", () => ({
  useAuth: () => ({
    user: { username: "Test User", email: "test@example.com" },
    isLoading: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
  }),
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

  it("mounts PrototypeTourModal when portalGuideEnabled is true", async () => {
    render(<AppShell><div>content</div></AppShell>);
    await waitFor(() => {
      expect(screen.getByTestId("tour-modal")).toBeInTheDocument();
    });
  });
});
