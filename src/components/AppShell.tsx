"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ClipboardList,
  Inbox,
  CheckSquare,
  Menu,
  Plus,
  X,
} from "lucide-react";
import { useAuth } from "./AuthProvider";
import { GlobalSearch } from "./GlobalSearch";
import { Sidebar, NavItem } from "./Sidebar";
import { isAdminAuthenticated } from "@/lib/adminSettings";

const NAV_ITEMS: NavItem[] = [
  { id: "forms", label: "Forms", icon: ClipboardList },
  { id: "requests", label: "Requests", icon: Inbox },
  { id: "approvals", label: "Approvals", icon: CheckSquare },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const isAuthRoute = pathname.startsWith("/auth/");
  const isAdminRoute = pathname.startsWith("/admin");
  const isDemoRoute = pathname === "/requestor-view" || pathname === "/approver-view";

  useEffect(() => {
    setIsAdmin(isAdminAuthenticated());
  }, [pathname]);

  useEffect(() => {
    if (!isLoading && !user && !isAuthRoute && !isDemoRoute && !isAdminRoute) {
      const destination = pathname + window.location.search;
      router.replace(`/auth/signin?callbackUrl=${encodeURIComponent(destination)}`);
    }
  }, [isAdminRoute, isAuthRoute, isDemoRoute, isLoading, pathname, router, user]);

  useEffect(() => {
    if (!mobileOpen) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [mobileOpen]);

  useEffect(() => {
    if (isLoading || !user || isAuthRoute || isAdminRoute || isDemoRoute || isAdmin || !user.permissions) return;
    const pagePermission = pathname.startsWith("/admin") ? "settings" : pathname.startsWith("/approvals") ? "approvals" : pathname.startsWith("/form") ? "forms" : "requests";
    if (!user.permissions.includes(pagePermission)) {
      const fallback = user.permissions.includes("requests") ? "/requests" : user.permissions.includes("forms") ? "/form" : "/auth/signin";
      router.replace(fallback);
    }
  }, [isAdmin, isAdminRoute, isAuthRoute, isDemoRoute, isLoading, pathname, router, user]);

  if (isAuthRoute) return <>{children}</>;
  if (isAdminRoute) return <>{children}</>;
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
    if (pathname.startsWith("/admin")) return "settings";
    return "requests";
  };
  const activeKey = getActiveKey();
  const allowedPages = user.permissions;


  const handleSelectView = (view: string) => {
    setMobileOpen(false);
    if (view === "forms") router.push("/form");
    else if (view === "approvals") router.push("/approvals");
    else if (view === "settings") router.push("/admin");
    else router.push("/requests");
  };

  const userName = user.username || "Dave Policarpio";
  const userEmail = user.email || "dave.policarpio@primephilippines.com";

  return (
    <div>
      <a href="#workspace" className="prime-button prime-skip-link">Skip to content</a>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <button
            type="button"
            className="fixed inset-0 bg-[#003366]/70 backdrop-blur-xs cursor-pointer border-none"
            aria-label="Close navigation overlay"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative z-10 w-64 h-full">
            <Sidebar
              currentView={activeKey}
              onSelectView={handleSelectView}
              user={{
                username: userName,
                email: userEmail,
                profilePicture: user.profilePicture || "/dave-avatar.png",
                workspaceName: user.workspaceName,
              }}
              isAdmin={isAdmin}
              onSignOut={signOut}
              items={NAV_ITEMS}
              allowedPages={allowedPages}
              isPinned={true}
              className="!w-64"
            />
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Close navigation menu"
              className="absolute top-3 right-3 text-white/80 hover:text-white p-1"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Desktop Reusable Sidebar */}
      <div className="hidden md:block">
        <Sidebar
          currentView={activeKey}
          onSelectView={handleSelectView}
          user={{
            username: userName,
            email: userEmail,
            profilePicture: user.profilePicture || "/dave-avatar.png",
            workspaceName: user.workspaceName,
          }}
          isAdmin={isAdmin}
          onSignOut={signOut}
          items={NAV_ITEMS}
          allowedPages={allowedPages}
          onExpandedChange={(expanded) => setIsSidebarExpanded(expanded)}
        />
      </div>

      {/* Main app workspace container - Resizes smoothly beside sidebar without clipping */}
      <div
        className="prime-app-content"
        data-sidebar-expanded={isSidebarExpanded}
      >
        {/* Compact 44px Topbar */}
        <header className="prime-topbar">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="prime-mobile-toggle prime-icon-button md:hidden h-8 w-8 min-h-0 min-w-0 flex items-center justify-center cursor-pointer"
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
