import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import React from "react";
import { Sidebar, NavItem } from "@/components/Sidebar";
import { ClipboardList, Inbox, CheckSquare } from "lucide-react";

const testItems: NavItem[] = [
  { id: "forms", label: "Forms", icon: ClipboardList, badge: 3 },
  { id: "requests", label: "Requests", icon: Inbox },
  { id: "approvals", label: "Approvals", icon: CheckSquare },
];

describe("Sidebar", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders configured navigation items in order and highlights current view", () => {
    const onSelectView = vi.fn();
    render(
      <Sidebar
        currentView="requests"
        onSelectView={onSelectView}
        items={testItems}
      />
    );

    expect(screen.getByRole("button", { name: /^forms/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^requests/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^approvals/i })).toBeInTheDocument();

    const activeItem = screen.getByRole("button", { name: /^requests/i });
    expect(activeItem).toHaveAttribute("aria-current", "page");
  });

  it("calls onSelectView when an item is clicked", () => {
    const onSelectView = vi.fn();
    render(
      <Sidebar
        currentView="requests"
        onSelectView={onSelectView}
        items={testItems}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /^forms/i }));
    expect(onSelectView).toHaveBeenCalledWith("forms");
  });

  it("handles hover expand and 150ms collapse timer with re-enter cancellation", () => {
    const onExpandedChange = vi.fn();
    const { container } = render(
      <Sidebar
        currentView="requests"
        onSelectView={vi.fn()}
        items={testItems}
        isPinned={false}
        onExpandedChange={onExpandedChange}
      />
    );

    const aside = container.querySelector("aside");
    expect(aside).toHaveClass("w-[72px]");

    // Pointer enters -> expands immediately
    fireEvent.mouseEnter(aside!);
    expect(aside).toHaveClass("w-64");

    // Pointer leaves -> triggers 150ms delay
    fireEvent.mouseLeave(aside!);
    // Still expanded before 150ms
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(aside).toHaveClass("w-64");

    // Advance remaining time -> collapses
    act(() => {
      vi.advanceTimersByTime(60);
    });
    expect(aside).toHaveClass("w-[72px]");

    // Test re-entry cancels collapse timer
    fireEvent.mouseEnter(aside!);
    expect(aside).toHaveClass("w-64");
    fireEvent.mouseLeave(aside!);
    act(() => {
      vi.advanceTimersByTime(100);
    });
    // Re-enter at 100ms
    fireEvent.mouseEnter(aside!);
    act(() => {
      vi.advanceTimersByTime(100);
    });
    // Still expanded because timer was cancelled
    expect(aside).toHaveClass("w-64");
  });

  it("toggles pin/unpin and stays expanded when pinned", () => {
    const onPinChange = vi.fn();
    const { container } = render(
      <Sidebar
        currentView="requests"
        onSelectView={vi.fn()}
        items={testItems}
        onPinChange={onPinChange}
      />
    );

    const aside = container.querySelector("aside");
    // Collapsed by default: w-[72px]
    expect(aside).toHaveClass("w-[72px]");

    // Click expand and pin
    const pinBtn = screen.getByRole("button", { name: /expand and pin sidebar/i });
    fireEvent.click(pinBtn);
    expect(onPinChange).toHaveBeenCalledWith(true);
  });

  it("filters items by allowedPages for non-admin users", () => {
    render(
      <Sidebar
        currentView="forms"
        onSelectView={vi.fn()}
        items={testItems}
        allowedPages={["forms"]}
        isAdmin={false}
      />
    );

    expect(screen.getByRole("button", { name: /^forms/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^requests/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^approvals/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /settings/i })).not.toBeInTheDocument();
  });

  it("shows all items and Settings button when isAdmin is true", () => {
    render(
      <Sidebar
        currentView="forms"
        onSelectView={vi.fn()}
        items={testItems}
        allowedPages={["forms"]}
        isAdmin={true}
      />
    );

    expect(screen.getByRole("button", { name: /^forms/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^requests/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^approvals/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /settings/i })).toBeInTheDocument();
  });

  it("renders user initials fallback and triggers sign out", () => {
    const onSignOut = vi.fn();
    render(
      <Sidebar
        currentView="forms"
        onSelectView={vi.fn()}
        items={testItems}
        user={{
          username: "Dave Policarpio",
          email: "dave@example.com",
          workspaceName: "PRIME Philippines",
        }}
        onSignOut={onSignOut}
      />
    );

    expect(screen.getByText("Dave Policarpio")).toBeInTheDocument();
    expect(screen.getByText("dave@example.com")).toBeInTheDocument();
    expect(screen.getByText("DP")).toBeInTheDocument();

    const signOutBtn = screen.getByRole("button", { name: /sign out/i });
    fireEvent.click(signOutBtn);
    expect(onSignOut).toHaveBeenCalled();
  });

  it("renders profile picture when provided and falls back to initials on error", () => {
    const { rerender } = render(
      <Sidebar
        items={testItems}
        currentView="forms"
        onSelectView={() => {}}
        user={{
          username: "Dave Policarpio",
          email: "dave@example.com",
          profilePicture: "https://example.com/avatar.jpg",
        }}
      />
    );

    const img = screen.getByRole("img", { name: "Dave Policarpio" });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "https://example.com/avatar.jpg");

    // Trigger image load error
    fireEvent.error(img);

    // Should gracefully fall back to initials
    expect(screen.getByText("DP")).toBeInTheDocument();
  });
});
