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
  it("renders only Forms, Requests, and Approvals nav items in the sidebar", () => {
    render(<AppShell><div>content</div></AppShell>);
    expect(screen.getAllByRole("button", { name: /^forms$/i })[0]).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^requests$/i })[0]).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^approvals$/i })[0]).toBeInTheDocument();

    // Verify removed mock navigation links
    expect(screen.queryByRole("button", { name: /^dashboard$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^tasks$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^notebook$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^meetings$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^notetaker$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^market insights$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^demands$/i })).not.toBeInTheDocument();
  });

  it("renders New Request action link in topbar", () => {
    render(<AppShell><div>content</div></AppShell>);
    expect(screen.getByRole("link", { name: /new request/i })).toBeInTheDocument();
  });

  it("does not render redundant topbar badge or refresh button", () => {
    render(<AppShell><div>content</div></AppShell>);
    expect(screen.queryByText(/forms portal/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /refresh page/i })).not.toBeInTheDocument();
  });

  it("renders the sidebar pin/unpin toggle button", () => {
    render(<AppShell><div>content</div></AppShell>);
    expect(screen.getAllByRole("button", { name: /pin sidebar|unpin sidebar/i })[0]).toBeInTheDocument();
  });
});
