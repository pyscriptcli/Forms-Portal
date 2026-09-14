"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Inbox,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Settings,
  Sparkles,
  FileSpreadsheet,
  LogOut,
  Plus,
} from "lucide-react";
import { useSession, signIn, signOut } from "next-auth/react";
import { GlobalSearch } from "./GlobalSearch";
import { PrototypeTourModal } from "./PrototypeTourModal";
import { getAdminSettings } from "@/lib/adminSettings";

const NAV_ITEMS = [
  {
    label: "Requests",
    href: "/requests",
    icon: Inbox,
    badge: null,
  },
  {
    label: "Approvals",
    href: "/approvals",
    icon: ShieldCheck,
    badge: null,
  },
  {
    label: "Forms Library",
    href: "/",
    icon: FileSpreadsheet,
    badge: null,
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [portalGuideEnabled, setPortalGuideEnabled] = useState(true);

  // Read admin settings once on mount (client-side only)
  useEffect(() => {
    const s = getAdminSettings();
    setPortalGuideEnabled(s.portalGuideEnabled);
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((flags) => {
        if (typeof flags.portalGuideEnabled === "boolean") {
          setPortalGuideEnabled(flags.portalGuideEnabled);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-[#FFFCFB] flex flex-col">
      {/* ── Topbar (Clean White Header matching Screenshot) ─────────────── */}
      <header className="fixed top-0 left-0 right-0 z-40 h-12 bg-white border-b border-slate-200/90 flex items-center justify-between px-3 sm:px-4 shadow-2xs">
        {/* Left: Brand mark & title */}
        <div className="flex items-center gap-2.5 min-w-[200px]">
          <Link href="/requests" className="flex items-center gap-2 group">
            <div className="w-7 h-7 bg-[#002B49] text-[#C9A84C] flex items-center justify-center font-serif font-bold text-sm shadow-xs shrink-0">
              P
            </div>
            <span
              className="font-serif italic font-bold text-lg text-[#002B49] tracking-tight group-hover:text-[#C9A84C] transition-colors leading-none"
              style={{ fontFamily: "var(--font-cormorant), 'Cormorant Garamond', Georgia, serif" }}
            >
              Forms Portal
            </span>
          </Link>
        </div>

        {/* Center: Global Search Bar */}
        <div className="flex-1 flex justify-center max-w-lg px-2">
          <GlobalSearch />
        </div>

        {/* Right: Quick Actions & User Session */}
        <div className="flex items-center gap-2 min-w-[200px] justify-end">
          {/* New Request Button */}
          <Link
            href="/requests"
            className="h-8 px-3 text-xs font-semibold bg-[#002B49] hover:bg-[#00385f] text-white rounded flex items-center gap-1.5 shadow-2xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-[#C9A84C]" />
            <span className="hidden md:inline font-bold">New Form</span>
          </Link>

          {/* User Auth or Sign In Button */}
          {session ? (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              {session.user?.image ? (
                <img
                  src={session.user.image}
                  alt={session.user.name || "Avatar"}
                  className="w-7 h-7 rounded-full border border-slate-200 object-cover shadow-2xs"
                />
              ) : (
                <div
                  className="w-7 h-7 rounded-full text-white flex items-center justify-center text-xs font-bold shadow-2xs"
                  style={{
                    backgroundColor:
                      (session.user as any)?.color || "#7B68EE",
                  }}
                >
                  {session.user?.name?.charAt(0) ?? "U"}
                </div>
              )}
              <div className="hidden lg:flex flex-col text-left leading-tight max-w-[110px]">
                <span className="text-xs font-bold text-slate-800 truncate">
                  {session.user?.name}
                </span>
                <span className="text-[10px] text-slate-400 truncate">ClickUp</span>
              </div>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/auth/signin" })}
                className="text-slate-400 hover:text-slate-700 p-1 transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => signIn("clickup")}
              className="h-8 px-3 text-xs font-bold text-[#002B49] bg-[#C9A84C] hover:bg-[#b89640] rounded flex items-center gap-1.5 shadow-2xs transition-colors"
            >
              <span>Sign In</span>
            </button>
          )}
        </div>
      </header>

      {/* ── Collapsible Dark Navy Sidebar Rail (Screenshot Style) ─────────────── */}
      <aside
        aria-label="Main navigation"
        className={`
          fixed left-0 top-0 bottom-0 z-50
          bg-[#002B49] text-white
          flex flex-col justify-between
          transition-[width] duration-200 ease-in-out
          border-r border-[#001D32] shadow-xl
          ${isCollapsed ? "w-14" : "w-52"}
          hover:w-52 group/sidebar
        `}
      >
        {/* Top Section: Collapse Toggle & Navigation Items */}
        <div className="flex flex-col">
          {/* Top Toggle Chevron Button */}
          <div className="h-12 flex items-center justify-between px-3.5 border-b border-white/10">
            <button
              type="button"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="w-7 h-7 rounded flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>
            <span
              className={`text-xs font-serif italic text-[#C9A84C] font-bold truncate transition-opacity duration-150 ${
                isCollapsed ? "opacity-0 pointer-events-none" : "opacity-100"
              }`}
            >
              Portal Menu
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1 py-3 px-2">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/requests"
                  ? pathname === "/requests" || pathname === "/"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    relative flex items-center gap-3 h-10 px-2.5 rounded transition-all
                    ${
                      isActive
                        ? "bg-[#001D32] text-white border border-[#C9A84C]/90 shadow-xs"
                        : "text-white/70 hover:text-white hover:bg-white/10"
                    }
                  `}
                  title={item.label}
                >
                  <div
                    className={`w-5 h-5 flex items-center justify-center shrink-0 ${
                      isActive ? "text-[#C9A84C]" : "text-white/80"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span
                    className={`text-xs font-medium whitespace-nowrap overflow-hidden transition-opacity duration-150 ${
                      isCollapsed
                        ? "opacity-0 group-hover/sidebar:opacity-100"
                        : "opacity-100"
                    }`}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section: Tour, Settings & Profile */}
        <div className="p-2 border-t border-white/10 flex flex-col gap-1">
          {/* Optional Tour Trigger */}
          {portalGuideEnabled && (
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.dispatchEvent(new CustomEvent("open-prototype-drawer"));
                }
              }}
              className="flex items-center gap-3 h-9 px-2.5 rounded text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              title="Walkthrough & Guide"
            >
              <div className="w-5 h-5 flex items-center justify-center shrink-0 text-[#C9A84C]">
                <Sparkles className="w-4 h-4" />
              </div>
              <span
                className={`text-xs whitespace-nowrap overflow-hidden transition-opacity duration-150 ${
                  isCollapsed
                    ? "opacity-0 group-hover/sidebar:opacity-100"
                    : "opacity-100"
                }`}
              >
                Guide
              </span>
            </button>
          )}

          {/* Admin Settings Link */}
          <Link
            href="/admin"
            className="flex items-center gap-3 h-9 px-2.5 rounded text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            title="Admin Configuration"
          >
            <div className="w-5 h-5 flex items-center justify-center shrink-0">
              <Settings className="w-4 h-4" />
            </div>
            <span
              className={`text-xs whitespace-nowrap overflow-hidden transition-opacity duration-150 ${
                isCollapsed
                  ? "opacity-0 group-hover/sidebar:opacity-100"
                  : "opacity-100"
              }`}
            >
              Settings
            </span>
          </Link>
        </div>
      </aside>

      {/* ── Main Canvas (Offset for Topbar & Collapsed Sidebar) ─────────────── */}
      <main className="ml-14 pt-12 flex-1 min-h-[calc(100vh-3rem)]">
        {children}
      </main>

      {/* ── Tour Modal (Conditionally Mounted) ─────────────── */}
      {portalGuideEnabled && <PrototypeTourModal />}
    </div>
  );
}
