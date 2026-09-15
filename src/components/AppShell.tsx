"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  ClipboardList,
  Inbox,
  CheckSquare,
  ChevronRight,
  ChevronLeft,
  LogOut,
  Menu,
  X,
  Plus,
} from "lucide-react";
import { useAuth } from "./AuthProvider";
import { GlobalSearch } from "./GlobalSearch";

interface SidebarItem {
  key: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const SIDEBAR_ITEMS: SidebarItem[] = [
  { key: "forms", label: "Forms", href: "/form", icon: ClipboardList },
  { key: "requests", label: "Requests", href: "/requests", icon: Inbox },
  { key: "approvals", label: "Approvals", href: "/approvals", icon: CheckSquare },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isAuthRoute = pathname.startsWith("/auth/");

  useEffect(() => {
    if (!isLoading && !user && !isAuthRoute) {
      const destination = pathname + window.location.search;
      router.replace(`/auth/signin?callbackUrl=${encodeURIComponent(destination)}`);
    }
  }, [isAuthRoute, isLoading, pathname, router, user]);

  useEffect(() => {
    if (!mobileOpen) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [mobileOpen]);

  if (isAuthRoute) return <>{children}</>;
  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-prime-white flex items-center justify-center" role="status">
        <span className="prime-label">Loading workspace</span>
      </div>
    );
  }

  const getActiveKey = () => {
    if (pathname.startsWith("/form")) return "forms";
    if (pathname.startsWith("/approvals")) return "approvals";
    return "requests";
  };
  const activeKey = getActiveKey();

  const userName = user.username || "Dave Policarpio";
  const userEmail = user.email || "dave.policarpio@primephilippines.com";

  return (
    <div>
      <a href="#workspace" className="prime-button prime-skip-link">Skip to content</a>
      {mobileOpen && (
        <button
          className="prime-dialog-backdrop md:hidden"
          aria-label="Close navigation overlay"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Collapsible Sidebar Matching Screenshot */}
      <aside
        id="portal-navigation"
        className="prime-sidebar"
        data-open={mobileOpen}
        data-expanded={!collapsed}
      >
        {/* Mobile close button */}
        <button
          className="prime-mobile-close prime-icon-button md:hidden"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        >
          <X size={18} />
        </button>

        {/* Top Header: Logo + Collapse Button */}
        <div className="h-12 border-b border-prime-rule flex items-center justify-between px-3">
          {!collapsed ? (
            <>
              <Link href="/requests" className="flex items-center pl-1">
                <Image
                  src="/prime-white-logo.png"
                  alt="PRIME Philippines"
                  width={110}
                  height={24}
                  className="h-6 w-auto object-contain"
                  priority
                />
              </Link>
              <button
                type="button"
                onClick={() => setCollapsed(true)}
                className="w-7 h-7 flex items-center justify-center text-prime-white/70 hover:text-prime-white rounded-none cursor-pointer transition-colors"
                title="Collapse sidebar"
                aria-label="Collapse sidebar"
              >
                <ChevronLeft size={16} />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              className="w-full h-full flex items-center justify-center text-prime-white/70 hover:text-prime-white rounded-none cursor-pointer transition-colors"
              title="Expand sidebar"
              aria-label="Expand sidebar"
            >
              <ChevronRight size={18} />
            </button>
          )}
        </div>

        {/* Navigation Items List */}
        <nav className="py-2 px-1.5 space-y-1 overflow-y-auto flex-1 flex flex-col justify-start" aria-label="Main navigation">
          {SIDEBAR_ITEMS.map(({ key, label, href, icon: Icon }) => {
            const isActive = activeKey === key;
            return (
              <Link
                key={key}
                href={href}
                onClick={() => setMobileOpen(false)}
                title={label}
                aria-current={isActive ? "page" : undefined}
                className={`flex items-center gap-3 transition-colors shrink-0 h-10 ${
                  collapsed
                    ? `w-10 mx-auto justify-center ${
                        isActive
                          ? "border-l-2 border-prime-gold bg-[#0B3C68] text-prime-gold"
                          : "border-l-2 border-transparent text-prime-white/80 hover:text-prime-white hover:bg-prime-white/5"
                      }`
                    : `px-3 text-xs font-normal ${
                        isActive
                          ? "border-l-2 border-prime-gold bg-[#0B3C68] text-prime-gold font-medium"
                          : "border-l-2 border-transparent text-prime-white/85 hover:text-prime-white hover:bg-prime-white/5"
                      }`
                }`}
              >
                <Icon size={18} aria-hidden="true" className={isActive ? "text-prime-gold" : "text-prime-white/80"} />
                {!collapsed && <span className="truncate">{label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Section Matching Screenshot */}
        <div className="mt-auto border-t border-prime-rule flex flex-col">
          {/* Workspace label or ClickUp badge */}
          {!collapsed ? (
            <div className="px-3 py-2 flex items-center justify-between text-[10px] tracking-wider font-bold">
              <span className="text-prime-gold flex items-center gap-1">
                <span>■</span> COLLABORATE@PRIME
              </span>
              <span className="text-prime-white/40 text-[9px] uppercase font-normal">WORKSPACE</span>
            </div>
          ) : (
            <div className="py-2 flex items-center justify-center">
              <div
                className="w-7 h-7 border border-prime-gold text-prime-gold text-[11px] font-bold flex items-center justify-center"
                title="ClickUp Connected"
              >
                C
              </div>
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-prime-rule" />

          {/* User Profile Tile with Avatar and Signout */}
          <div className="p-2">
            {!collapsed ? (
              <div className="flex items-center justify-between gap-2 px-1">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Image
                    src="/dave-avatar.png"
                    alt={userName}
                    width={32}
                    height={32}
                    className="w-8 h-8 rounded-none border border-prime-white/20 object-cover shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-prime-white truncate">{userName}</p>
                    <p className="text-[10px] text-prime-white/50 truncate">{userEmail}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={signOut}
                  title="Sign out"
                  className="text-prime-white/60 hover:text-prime-white p-1 shrink-0 cursor-pointer"
                >
                  <LogOut size={15} />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1.5 py-1">
                <Image
                  src="/dave-avatar.png"
                  alt={userName}
                  width={28}
                  height={28}
                  className="w-7 h-7 rounded-none border border-prime-white/20 object-cover"
                />
                <button
                  type="button"
                  onClick={signOut}
                  title={`Sign out (${userName})`}
                  className="text-prime-white/60 hover:text-prime-white p-1 cursor-pointer"
                >
                  <LogOut size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main app workspace container */}
      <div
        className="prime-app-content"
        data-sidebar-expanded={!collapsed}
      >
        {/* Compact 44px Topbar */}
        <header className="prime-topbar">
          <div className="flex items-center gap-3">
            <button
              className="prime-mobile-toggle prime-icon-button md:hidden h-8 w-8 min-h-0 min-w-0"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
              aria-expanded={mobileOpen}
              aria-controls="portal-navigation"
            >
              <Menu size={16} />
            </button>
          </div>

          {/* Center search */}
          <div className="flex-1 max-w-sm">
            <GlobalSearch />
          </div>

          {/* Right action items */}
          <div className="flex items-center gap-2">
            {/* + NEW REQUEST button navigates to /form */}
            <Link
              href="/form"
              className="h-8 px-3 border border-prime-gold text-prime-blue bg-prime-white hover:bg-prime-gold/10 text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <Plus size={13} className="text-prime-blue" />
              <span>NEW REQUEST</span>
            </Link>
          </div>
        </header>

        {/* Workspace */}
        <main id="workspace" tabIndex={-1} className="prime-workspace">
          {children}
        </main>
      </div>
    </div>
  );
}


