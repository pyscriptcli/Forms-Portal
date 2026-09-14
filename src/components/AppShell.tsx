"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ClipboardList,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  RefreshCw,
  Sparkles,
  LogOut,
  Boxes,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "./AuthProvider";
import { GlobalSearch } from "./GlobalSearch";

const NAV_ITEMS = [
  { label: "Requests", href: "/requests", icon: ClipboardList },
  { label: "Approvals", href: "/approvals", icon: ShieldCheck },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    if (!userMenuOpen) return;
    const close = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [userMenuOpen]);

  if (isAuthRoute) return <>{children}</>;
  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-prime-white flex items-center justify-center" role="status">
        <span className="prime-label">Loading workspace</span>
      </div>
    );
  }

  const userInitial = (user.username?.charAt(0) || "D").toUpperCase();

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

      {/* Collapsible Rail Sidebar */}
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

        {/* Top collapse / expand toggle chevron */}
        <div className="h-11 border-b border-prime-rule flex items-center justify-between px-3">
          <button
            type="button"
            onClick={() => setCollapsed((prev) => !prev)}
            className="w-8 h-8 flex items-center justify-center text-prime-white/80 hover:text-prime-white rounded-none cursor-pointer transition-colors"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
          {!collapsed && (
            <span className="text-[11px] font-semibold uppercase tracking-wider text-prime-white truncate pl-2">
              Forms Portal
            </span>
          )}
        </div>

        {/* Rail navigation items */}
        <nav className="p-2 space-y-2" aria-label="Main navigation">
          {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                title={label}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 transition-colors ${
                  collapsed
                    ? `w-10 h-10 mx-auto justify-center ${
                        active
                          ? "border border-prime-gold bg-prime-blue text-prime-gold"
                          : "text-prime-white/70 hover:text-prime-white"
                      }`
                    : `px-3 py-2 text-xs font-medium uppercase tracking-wider ${
                        active
                          ? "border border-prime-gold bg-prime-blue text-prime-gold"
                          : "text-prime-white/70 hover:text-prime-white"
                      }`
                }`}
              >
                <Icon size={18} aria-hidden="true" className={active ? "text-prime-gold" : ""} />
                {!collapsed && <span>{label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Rail footer icons */}
        <div className="mt-auto p-2 border-t border-prime-rule flex flex-col items-center gap-2">
          {/* Hexagon/Cube icon */}
          <div
            className="w-8 h-8 flex items-center justify-center text-prime-white/60 hover:text-prime-white"
            title="Prime Modules"
          >
            <Boxes size={18} />
          </div>

          {/* ClickUp 'C' tile */}
          <div
            className="w-7 h-7 border border-prime-white/40 bg-prime-blue flex items-center justify-center text-[11px] font-bold text-prime-white"
            title="ClickUp Connected"
          >
            C
          </div>

          {/* User profile tile */}
          <div className="w-full flex items-center justify-center pt-1">
            {collapsed ? (
              <button
                type="button"
                onClick={signOut}
                title={`Signed in as ${user.username}. Click to sign out.`}
                className="w-7 h-7 bg-prime-gold text-prime-blue font-bold text-xs flex items-center justify-center cursor-pointer hover:opacity-90"
              >
                {userInitial}
              </button>
            ) : (
              <div className="w-full p-2 bg-prime-blue border border-prime-gold/40 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-prime-white truncate">{user.username}</p>
                  <p className="text-[10px] text-prime-white/60 truncate">{user.email}</p>
                </div>
                <button
                  type="button"
                  onClick={signOut}
                  title="Sign out"
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
            <Link
              href="/requests"
              className="h-8 px-3 border border-prime-gold text-prime-blue bg-prime-white hover:bg-prime-white text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <span>+ NEW REQUEST</span>
            </Link>

            <div className="hidden sm:flex h-8 px-3 bg-prime-blue text-prime-white text-xs font-medium items-center gap-1.5 cursor-default whitespace-nowrap">
              <Sparkles size={12} className="text-prime-gold" />
              <span>Forms Portal</span>
            </div>

            {/* User dropdown pill */}
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setUserMenuOpen((prev) => !prev)}
                className="h-8 px-2.5 sm:px-3 border border-prime-rule hover:border-prime-blue text-xs text-prime-blue font-medium flex items-center gap-1.5 bg-prime-white transition-colors cursor-pointer"
                aria-expanded={userMenuOpen}
              >
                <span className="truncate max-w-[120px]">{user.username || "Dave Policarpio"}</span>
                <ChevronDown size={13} className="text-prime-ink/60 shrink-0" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-52 bg-prime-white border border-prime-blue z-50 p-2 text-left">
                  <div className="px-2 py-1.5 border-b border-prime-rule">
                    <p className="text-xs font-semibold text-prime-blue truncate">{user.username}</p>
                    <p className="text-[11px] text-prime-ink/60 truncate">{user.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={signOut}
                    className="w-full mt-1 px-2 py-1.5 text-xs text-left text-prime-blue hover:bg-prime-blue hover:text-prime-white flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <LogOut size={13} />
                    <span>Sign out</span>
                  </button>
                </div>
              )}
            </div>

            {/* Refresh button */}
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="h-8 px-2.5 border border-prime-rule hover:border-prime-blue text-xs text-prime-ink flex items-center gap-1.5 bg-prime-white hover:text-prime-blue transition-colors cursor-pointer"
              title="Refresh page"
            >
              <RefreshCw size={13} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
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


