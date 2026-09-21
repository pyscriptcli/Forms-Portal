"use client";

import { FormEvent, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { PrimeLogo } from "@/components/PrimeLogo";
import { setAdminSession, validateAdminCredentials } from "@/lib/adminSettings";

function SignInContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const hasError = Boolean(searchParams.get("error"));
  const isAdminLogin = callbackUrl.startsWith("/admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [adminError, setAdminError] = useState("");

  const handleAdminLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateAdminCredentials(email, password)) {
      setAdminError("Invalid administrator email or password.");
      return;
    }
    setAdminSession();
    window.location.assign(callbackUrl);
  };

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
          {hasError && !isAdminLogin && (
            <p role="alert" className="prime-notice">
              We couldn’t complete sign-in. Please try again or contact your administrator.
            </p>
          )}
          {isAdminLogin ? (
            <form onSubmit={handleAdminLogin} className="space-y-5">
              <p className="text-sm text-prime-ink/80">Sign in with your administrator account.</p>
              <div><label htmlFor="admin-email" className="prime-label block mb-2">Email</label><input id="admin-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="prime-field" autoComplete="username" required /></div>
              <div><label htmlFor="admin-password" className="prime-label block mb-2">Password</label><input id="admin-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="prime-field" autoComplete="current-password" required /></div>
              {adminError && <p role="alert" className="prime-notice">{adminError}</p>}
              <button type="submit" className="prime-button w-full"><LockKeyhole size={16} aria-hidden="true" /><span>Sign in as administrator</span><ArrowRight size={18} aria-hidden="true" /></button>
            </form>
          ) : (
            <a className="prime-button" href={`/api/auth/clickup/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}><LockKeyhole size={16} aria-hidden="true" /><span>Continue with ClickUp</span><ArrowRight size={18} aria-hidden="true" /></a>
          )}
        </section>
      </div>
    </main>
  );
}

export default function SignInPage() {
  return <Suspense fallback={<div className="prime-signin" aria-label="Loading sign-in" />}><SignInContent /></Suspense>;
}


