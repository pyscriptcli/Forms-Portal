"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Inbox, ShieldCheck } from "lucide-react";
import { useSession, signIn, signOut } from "next-auth/react";
import { GlobalSearch } from "./GlobalSearch";
import { PrototypeTourModal } from "./PrototypeTourModal";
import { getAdminSettings } from "@/lib/adminSettings";

const NAV_ITEMS = [
  { label: "Requests", href: "/requests", icon: Inbox },
  { label: "Approvals", href: "/approvals", icon: ShieldCheck },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [portalGuideEnabled, setPortalGuideEnabled] = useState(true);

  // Read admin settings once on mount (client-side only)
  useEffect(() => {
    const s = getAdminSettings();
    setPortalGuideEnabled(s.portalGuideEnabled);
    // Also fetch server-side flags to stay in sync with admin toggles
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
    <>
      {/* ── Topbar ─────────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-[#003366] flex items-center px-4 gap-4 border-b border-[#002244]">
        {/* Gold accent rule */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#C9A84C]" />

        {/* Logo mark */}
        <Link href="/requests" aria-label="Home" className="shrink-0 flex items-center gap-2.5 group mt-0.5">
          <div className="w-8 h-8 bg-[#C9A84C] flex items-center justify-center font-serif font-black text-[#003366] text-base shadow-sm shrink-0">
            P
          </div>
          <span
            className="hidden sm:block font-serif italic font-bold text-xl tracking-tight text-white group-hover:text-[#C9A84C] transition-colors leading-none"
            style={{ fontFamily: "var(--font-cormorant), 'Cormorant Garamond', Georgia, serif" }}
          >
            Forms Portal
          </span>
        </Link>

        {/* Global search — centered */}
        <div className="flex-1 flex justify-center px-2">
          <GlobalSearch />
        </div>

        {/* User auth */}
        <div className="flex items-center shrink-0">
          {session ? (
            <div className="flex items-center gap-2 h-8 px-2 text-xs text-white">
              {session.user?.image ? (
                <img
                  src={session.user.image}
                  alt="Avatar"
                  className="w-6 h-6 rounded-full border border-white/30"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-white/20 border border-white/30 flex items-center justify-center font-bold text-[11px] text-white">
                  {session.user?.name?.charAt(0) ?? "U"}
                </div>
              )}
              <span className="hidden md:inline-block font-medium truncate max-w-[100px]">
                {session.user?.name}
              </span>
              <button
                onClick={() => signOut()}
                className="ml-1 text-[10px] uppercase font-bold text-white/50 hover:text-white transition-colors"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <button
              onClick={() => signIn()}
              className="h-8 px-3 text-xs font-bold text-[#003366] bg-[#C9A84C] hover:bg-[#b89640] rounded-sm flex items-center shadow-sm transition-colors"
            >
              Sign In
            </button>
          )}
        </div>
      </header>

      {/* ── Sidebar ────────────────────────────────────────────── */}
      <nav
        aria-label="Main navigation"
        className="
          fixed left-0 top-14 bottom-0 z-40
          w-16 hover:w-56
          bg-white border-r border-slate-200 shadow-sm
          overflow-hidden
          transition-[width] duration-200 ease-in-out
          flex flex-col pt-3 gap-1
          group/sidebar
        "
      >
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
                relative flex items-center gap-3 h-10 px-4 mx-2 rounded-sm
                text-xs font-semibold transition-all whitespace-nowrap overflow-hidden
                ${
                  isActive
                    ? "bg-blue-50 text-[#003366] font-bold border-l-2 border-[#C9A84C] pl-[14px]"
                    : "text-slate-500 hover:bg-slate-50 hover:text-[#003366]"
                }
              `}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-150">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* ── Main content ────────────────────────────────────────── */}
      <div className="ml-16 pt-14 min-h-screen bg-[#f8fafc]">
        {children}
      </div>

      {/* ── Portal Guide (conditionally mounted) ─────────────── */}
      {portalGuideEnabled && <PrototypeTourModal />}
    </>
  );
}
