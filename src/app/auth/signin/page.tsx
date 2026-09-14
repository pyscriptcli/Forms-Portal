"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowUpRight, LockKeyhole } from "lucide-react";

function SignInContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const handleSignIn = () => { window.location.href = `/api/auth/clickup/login?callbackUrl=${encodeURIComponent(callbackUrl)}`; };

  return <main className="grid min-h-screen bg-[#003366] text-[#FFFCFB] lg:grid-cols-[1.05fr_0.95fr]">
    <section className="relative hidden overflow-hidden border-r border-white/10 p-12 lg:flex lg:flex-col lg:justify-between xl:p-20">
      <div className="absolute -right-40 -top-32 h-[540px] w-[540px] rounded-none border border-[#C9A84C]/20" /><div className="absolute -right-24 -top-16 h-[380px] w-[380px] rounded-none border border-[#C9A84C]/15" />
      <div className="relative"><img src="/prime-white-logo.png" alt="PRIME Philippines" className="h-12 w-auto object-contain object-left" /></div>
      <div className="relative max-w-xl"><h1 className="prime-display max-w-lg text-[#FFFCFB]">Forms Portal</h1></div>
      <p className="relative text-[11px] text-[#FFFCFB]/35">Forms Portal</p>
    </section>
    <section className="flex items-center justify-center px-6 py-12 sm:px-10">
      <div className="w-full max-w-[390px]"><div className="mb-12 lg:hidden"><img src="/prime-blue-logo.png" alt="PRIME Philippines" className="h-10 w-auto object-contain object-left" /></div><h2 className="prime-heading text-[#FFFCFB]">Sign in to your workspace</h2><button type="button" onClick={handleSignIn} className="mt-9 flex h-12 w-full items-center justify-between rounded-none bg-[#C9A84C] px-4 text-[13px] font-bold uppercase tracking-[0.06em] text-[#003366] transition hover:bg-[#e3c574]"><span className="flex items-center gap-2"><LockKeyhole size={16} /> Continue with ClickUp</span><ArrowUpRight size={17} /></button></div>
    </section>
  </main>;
}

export default function SignInPage() { return <Suspense fallback={<div className="min-h-screen bg-[#003366]" />}><SignInContent /></Suspense>; }


