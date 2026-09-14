"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { PrimeLogo } from "@/components/PrimeLogo";

function SignInContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const hasError = Boolean(searchParams.get("error"));

  return (
    <main className="prime-signin">
      <header className="prime-signin-header">
        <PrimeLogo className="h-14" />
      </header>
      <div className="prime-signin-main">
        <section aria-labelledby="portal-title">
          <div className="prime-rule" aria-hidden="true" />
          <h1 id="portal-title" className="prime-display prime-signin-title">Forms Portal</h1>
        </section>
        <section className="prime-signin-form" aria-labelledby="signin-title">
          <h2 id="signin-title" className="prime-heading">Sign in</h2>
          {hasError && (
            <p role="alert" className="prime-notice">
              We couldn’t complete sign-in. Please try again or contact your administrator.
            </p>
          )}
          <a
            className="prime-button"
            href={`/api/auth/clickup/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
          >
            <LockKeyhole size={16} aria-hidden="true" />
            <span>Continue with ClickUp</span>
            <ArrowRight size={18} aria-hidden="true" />
          </a>
        </section>
      </div>
    </main>
  );
}

export default function SignInPage() {
  return <Suspense fallback={<div className="prime-signin" aria-label="Loading sign-in" />}><SignInContent /></Suspense>;
}


