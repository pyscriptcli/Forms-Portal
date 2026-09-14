import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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

// Mock GlobalSearch to isolate AppShell
vi.mock("@/components/GlobalSearch", () => ({
  GlobalSearch: () => <div data-testid="global-search" />,
}));

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

  it("renders the collapsible sidebar toggle button", () => {
    render(<AppShell><div>content</div></AppShell>);
    expect(screen.getByRole("button", { name: /expand sidebar|collapse sidebar/i })).toBeInTheDocument();
  });
});
