"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowUpRight, ClipboardList, FileText, LayoutDashboard, LogOut, Menu, Settings, ShieldCheck, Sparkles, X } from "lucide-react";
import { useAuth } from "./AuthProvider";
import { PrototypeTourModal } from "./PrototypeTourModal";
import { getAdminSettings } from "@/lib/adminSettings";

const NAV_ITEMS = [
  { label: "Workspace", href: "/", icon: LayoutDashboard },
  { label: "Requests", href: "/requests", icon: ClipboardList },
  { label: "Approvals", href: "/approvals", icon: ShieldCheck },
  { label: "Forms library", href: "/workflow", icon: FileText },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [portalGuideEnabled, setPortalGuideEnabled] = useState(true);
  const isAuthRoute = pathname.startsWith("/auth/");

  useEffect(() => {
    if (!isLoading && !user && !isAuthRoute) router.replace(`/auth/signin?callbackUrl=${encodeURIComponent(pathname)}`);
  }, [isAuthRoute, isLoading, pathname, router, user]);

  useEffect(() => {
    setPortalGuideEnabled(getAdminSettings().portalGuideEnabled);
    fetch("/api/admin/settings").then((response) => response.json()).then((flags) => {
      if (typeof flags.portalGuideEnabled === "boolean") setPortalGuideEnabled(flags.portalGuideEnabled);
    }).catch(() => undefined);
  }, []);

  if (isAuthRoute) return <>{children}</>;
  if (isLoading || !user) return <div className="min-h-screen bg-[#FFFCFB]" aria-label="Loading workspace" />;

  const navigation = (
    <div className="flex h-full flex-col">
      <div className="flex h-[76px] items-center border-b border-[#FFFCFB]/10 px-6">
        <Link href="/" className="flex items-center gap-3" onClick={() => setMobileOpen(false)}><img src="/prime-white-logo.png" alt="PRIME Philippines" className="h-9 w-auto object-contain object-left" /><span className="border-l border-[#FFFCFB]/25 pl-3 text-[13px] font-medium uppercase tracking-[0.12em] text-[#FFFCFB]">Forms Portal</span></Link>
        <button className="ml-auto text-[#FFFCFB]/45 md:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X size={20} /></button>
      </div>
      <div className="px-4 pt-7"><p className="px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#FFFCFB]/35">Navigate</p><nav className="mt-3 space-y-1">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => { const active = href === "/" ? pathname === "/" : pathname.startsWith(href); return <Link key={href} href={href} onClick={() => setMobileOpen(false)} className={`group flex items-center gap-3 rounded-none px-3 py-2.5 text-[13px] transition ${active ? "bg-[#FFFCFB]/10 text-[#FFFCFB]" : "text-[#FFFCFB]/55 hover:bg-[#FFFCFB]/6 hover:text-[#FFFCFB]"}`}><Icon size={17} className={active ? "text-[#C9A84C]" : "text-[#FFFCFB]/40 group-hover:text-[#FFFCFB]/75"} /><span>{label}</span>{active && <span className="ml-auto h-1.5 w-1.5 rounded-none bg-[#C9A84C]" />}</Link>; })}
      </nav></div>
      <div className="mt-auto px-4 pb-5">
        {portalGuideEnabled && <button onClick={() => window.dispatchEvent(new CustomEvent("open-prototype-drawer"))} className="mb-2 flex w-full items-center gap-3 rounded-none px-3 py-2.5 text-left text-[13px] text-[#FFFCFB]/50 hover:bg-[#FFFCFB]/6 hover:text-[#FFFCFB]"><Sparkles size={17} className="text-[#C9A84C]" /> Guide</button>}
        <Link href="/admin" className="mb-4 flex items-center gap-3 rounded-none px-3 py-2.5 text-[13px] text-[#FFFCFB]/50 hover:bg-[#FFFCFB]/6 hover:text-[#FFFCFB]"><Settings size={17} /> Settings</Link>
        <div className="border-t border-[#FFFCFB]/10 pt-4"><div className="flex items-center gap-3 px-2"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-none bg-[#C9A84C] text-xs font-bold text-[#003366]">{user.username?.charAt(0) ?? "U"}</div><div className="min-w-0 flex-1"><p className="truncate text-[12px] font-medium text-[#FFFCFB]">{user.username}</p><p className="truncate text-[10px] text-[#FFFCFB]/40">{user.email}</p></div><button onClick={signOut} className="text-[#FFFCFB]/35 hover:text-[#FFFCFB]" title="Sign out" aria-label="Sign out"><LogOut size={16} /></button></div></div>
      </div>
    </div>
  );

  return <div className="min-h-screen bg-[#FFFCFB] text-[#181D1E]"><aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] bg-[#003366] md:block">{navigation}</aside>{mobileOpen && <><button className="fixed inset-0 z-40 bg-[#003366]/50 md:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation overlay" /><aside className="fixed inset-y-0 left-0 z-50 w-[270px] bg-[#003366] md:hidden">{navigation}</aside></>}<div className="md:pl-[248px]"><header className="sticky top-0 z-30 flex h-[76px] items-center justify-between border-b border-[#E4E0D8] bg-[#FFFCFB]/95 px-5 backdrop-blur md:px-10"><div className="flex items-center gap-3"><button className="text-[#181D1E] md:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={21} /></button><div className="hidden items-center gap-2 text-[12px] text-[#888780] sm:flex"><span>Prime Philippines</span><ArrowUpRight size={13} /><span className="text-[#181D1E]">Forms Portal</span></div></div><div className="flex items-center gap-4"><Link href="/requests" className="hidden text-[12px] font-semibold text-[#181D1E] hover:text-[#003366] sm:block">Need to submit?</Link><Link href="/requests" className="flex items-center gap-2 rounded-none bg-[#003366] px-3.5 py-2 text-[12px] font-semibold text-[#FFFCFB] shadow-sm hover:bg-[#003366]">New request <ArrowUpRight size={14} className="text-[#C9A84C]" /></Link></div></header><main className="min-h-[calc(100vh-76px)] px-5 py-7 md:px-10 md:py-9">{children}</main></div>{portalGuideEnabled && <PrototypeTourModal />}</div>;
}


