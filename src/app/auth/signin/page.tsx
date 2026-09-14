"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";

function SignInContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const handleSignIn = () => {
    window.location.href = `/api/auth/clickup/login?callbackUrl=${encodeURIComponent(callbackUrl)}`;
  };

  return (
    <div className="min-h-screen bg-[#FFFCFB] flex items-center justify-center p-6 text-[#0C0C0E]">
      {/* Subtle background ambient accents */}
      <div className="w-full max-w-sm bg-white border border-slate-200/90 shadow-[0_8px_30px_rgb(0,0,0,0.06)] relative overflow-hidden">
        {/* PRIME Gold Top Rule */}
        <div className="h-1 bg-[#C9A84C] w-full" />

        <div className="p-8 sm:p-10 flex flex-col items-center text-center">
          {/* Brand Emblem */}
          <div className="w-11 h-11 bg-[#003366] text-[#C9A84C] flex items-center justify-center font-serif font-bold text-xl shadow-xs mb-5">
            P
          </div>

          {/* Heading */}
          <h1
            className="font-serif italic font-bold text-3xl text-[#003366] tracking-tight leading-none mb-2"
            style={{ fontFamily: "var(--font-cormorant), 'Cormorant Garamond', Georgia, serif" }}
          >
            Forms Portal
          </h1>
          <p className="text-xs text-slate-500 font-medium tracking-wide mb-8">
            Sign in to access your requests and approvals
          </p>

          {/* ClickUp OAuth Button */}
          <button
            type="button"
            onClick={handleSignIn}
            className="w-full h-11 px-4 bg-[#7B68EE] hover:bg-[#6c58e0] text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all shadow-sm hover:shadow active:scale-[0.99] cursor-pointer"
          >
            <svg
              className="w-4 h-4 fill-white shrink-0"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M2.5 19.3L4.8 17.5C5.8 18.7 7.3 19.5 9 19.5C10.7 19.5 12.2 18.7 13.2 17.5L15.5 19.3C13.9 21.1 11.6 22.2 9 22.2C6.4 22.2 4.1 21.1 2.5 19.3Z" />
              <path d="M9 14.5C6.5 14.5 4.5 12.5 4.5 10C4.5 7.5 6.5 5.5 9 5.5C11.5 5.5 13.5 7.5 13.5 10C13.5 12.5 11.5 14.5 9 14.5ZM9 2.5C4.9 2.5 1.5 5.9 1.5 10C1.5 14.1 4.9 17.5 9 17.5C13.1 17.5 16.5 14.1 16.5 10C16.5 5.9 13.1 2.5 9 2.5Z" />
              <path d="M19.5 7.5L17.7 9.3C18.4 10.1 18.8 11.1 18.8 12.2C18.8 14.8 16.7 16.9 14.1 16.9V19.9C18.3 19.9 21.8 16.4 21.8 12.2C21.8 10.4 21 8.8 19.5 7.5Z" />
            </svg>
            <span>Continue with ClickUp</span>
          </button>

          {/* Secure indicator */}
          <div className="mt-8 pt-4 border-t border-slate-100 w-full flex items-center justify-center gap-1.5 text-[10px] text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
            <span>ClickUp Workspace Authentication</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FFFCFB] flex items-center justify-center text-slate-400 text-xs">
          Loading Sign In...
        </div>
      }
    >
      <SignInContent />
    </Suspense>
  );
}
