"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRight, ClipboardList, FileText, LogOut, Menu, Settings, ShieldCheck, HelpCircle, Workflow, X } from "lucide-react";
import { useAuth } from "./AuthProvider";
import { PrototypeTourModal } from "./PrototypeTourModal";
import { PrimeLogo } from "./PrimeLogo";
import { GlobalSearch } from "./GlobalSearch";

const NAV_ITEMS = [
  { label: "Create a form", href: "/", icon: FileText },
  { label: "Requests", href: "/requests", icon: ClipboardList },
  { label: "Approvals", href: "/approvals", icon: ShieldCheck },
  { label: "Request status", href: "/track", icon: ClipboardList },
  { label: "Workflow", href: "/workflow", icon: Workflow },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [portalGuideEnabled, setPortalGuideEnabled] = useState(true);
  const isAuthRoute = pathname.startsWith("/auth/");

  useEffect(() => {
    if (!isLoading && !user && !isAuthRoute) {
      const destination = pathname + window.location.search;
      router.replace(`/auth/signin?callbackUrl=${encodeURIComponent(destination)}`);
    }
  }, [isAuthRoute, isLoading, pathname, router, user]);

  useEffect(() => {
    if (!user || isAuthRoute) return;
    let active = true;
    fetch("/api/admin/settings")
      .then((response) => response.json())
      .then((flags) => {
        if (active && typeof flags.portalGuideEnabled === "boolean") setPortalGuideEnabled(flags.portalGuideEnabled);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [user, isAuthRoute]);

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
    return <div className="min-h-screen bg-prime-white flex items-center justify-center" role="status"><span className="prime-label">Loading workspace</span></div>;
  }

  return (
    <div>
      <a href="#workspace" className="prime-button prime-skip-link">Skip to content</a>
      {mobileOpen && <button className="prime-dialog-backdrop md:hidden" aria-label="Close navigation overlay" onClick={() => setMobileOpen(false)} />}
      <aside id="portal-navigation" className="prime-sidebar" data-open={mobileOpen}>
        <button className="prime-mobile-close prime-icon-button" aria-label="Close navigation" onClick={() => setMobileOpen(false)}><X size={18} /></button>
        <div className="prime-sidebar-brand">
          <Link href="/" onClick={() => setMobileOpen(false)} aria-label="Forms Portal home"><PrimeLogo variant="white" className="h-12" /></Link>
          <p className="prime-label">Forms Portal</p>
        </div>
        <nav aria-label="Main navigation">
          {NAV_ITEMS.map(({ label, href, icon: Icon }) => (
            <Link key={href} href={href} className="prime-nav-link" aria-current={pathname === href ? "page" : undefined} onClick={() => setMobileOpen(false)}>
              <Icon size={18} aria-hidden="true" /><span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="prime-sidebar-footer">
          {portalGuideEnabled && <button className="prime-nav-link w-full" onClick={() => { setMobileOpen(false); window.dispatchEvent(new CustomEvent("open-prototype-drawer")); }}><HelpCircle size={18} aria-hidden="true" />Portal guide</button>}
          <Link href="/admin" className="prime-nav-link" aria-current={pathname === "/admin" ? "page" : undefined} onClick={() => setMobileOpen(false)}><Settings size={18} aria-hidden="true" />Settings</Link>
          <div className="prime-profile">
            <p>{user.username}</p>
            <p>{user.email}</p>
            <button className="prime-nav-link mt-3 -ml-3" onClick={signOut}><LogOut size={16} aria-hidden="true" />Sign out</button>
          </div>
        </div>
      </aside>
      <div className="prime-app-content">
        <header className="prime-topbar">
          <div className="flex items-center gap-4">
            <button className="prime-mobile-toggle prime-icon-button" onClick={() => setMobileOpen(true)} aria-label="Open navigation" aria-expanded={mobileOpen} aria-controls="portal-navigation"><Menu size={20} /></button>
            <span className="prime-topbar-title">Forms Portal</span>
          </div>
          <div className="hidden xl:block w-64"><GlobalSearch /></div>
          <Link href="/" className="prime-button">New form <ArrowRight size={16} aria-hidden="true" /></Link>
        </header>
        <main id="workspace" tabIndex={-1} className="prime-workspace">{children}</main>
      </div>
      {portalGuideEnabled && <PrototypeTourModal />}
    </div>
  );
}


