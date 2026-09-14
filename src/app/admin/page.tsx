"use client";
import { PageHeader } from "@/components/PageHeader";
import { PrimeLogo } from "@/components/PrimeLogo";

import React, { useState, useEffect } from "react";
import { ToggleLeft, ToggleRight, LogOut, Shield } from "lucide-react";
import {
  validateAdminCredentials,
  isAdminAuthenticated,
  setAdminSession,
  clearAdminSession,
  saveAdminSettings,
  getAdminSettings,
  ADMIN_TOKEN,
  type AdminSettings,
} from "@/lib/adminSettings";

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [settings, setSettings] = useState<AdminSettings>({
    portalGuideEnabled: true,
    rfpAutofillEnabled: true,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  useEffect(() => {
    if (isAdminAuthenticated()) {
      setAuthed(true);
      // Load latest flags from server
      fetch("/api/admin/settings")
        .then((r) => r.json())
        .then((flags) => setSettings(flags))
        .catch(() => setSettings(getAdminSettings()));
    }
  }, []);

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (validateAdminCredentials(email, password)) {
      setAdminSession();
      setAuthed(true);
      setLoginError("");
    } else {
      setLoginError("Invalid credentials. Please try again.");
    }
  }

  function handleLogout() {
    clearAdminSession();
    setAuthed(false);
    setEmail("");
    setPassword("");
  }

  async function handleToggle(key: keyof AdminSettings) {
    const updated = { ...settings, [key]: !settings[key] };
    setSettings(updated);
    saveAdminSettings(updated);
    setIsSaving(true);
    setSaveMsg("");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": ADMIN_TOKEN,
        },
        body: JSON.stringify({ [key]: updated[key] }),
      });
      if (!res.ok) throw new Error("Save failed");
      setSaveMsg("Saved.");
    } catch {
      setSaveMsg("Error saving — changes applied locally only.");
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMsg(""), 2500);
    }
  }

  if (!authed) {
    return (
      <div className="prime-page">
        <PageHeader title="Settings" description="Sign in with your administrator account to manage the portal." />
        <section className="prime-panel max-w-lg">
          <PrimeLogo className="h-10 mb-8" />
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label htmlFor="admin-email" className="prime-label block mb-2">Email</label>
              <input id="admin-email" type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="username" className="prime-field" required />
            </div>
            <div>
              <label htmlFor="admin-password" className="prime-label block mb-2">Password</label>
              <input id="admin-password" type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" className="prime-field" required />
            </div>
            {loginError && <p role="alert" className="prime-notice">{loginError}</p>}
            <button type="submit" className="prime-button w-full">Sign In</button>
          </form>
        </section>
      </div>
    );
  }

  /* ── Admin Dashboard ── */
  const toggles: { key: keyof AdminSettings; label: string; description: string }[] = [
    {
      key: "portalGuideEnabled",
      label: "Portal Guide",
      description:
        "Show the portal guide and the step-by-step form walkthrough.",
    },
    {
      key: "rfpAutofillEnabled",
      label: "RFP AI Autofill",
      description:
        "Allow requestors to fill payment forms from a vendor quotation.",
    },
  ];

  return (
    <div className="prime-page">
      <PageHeader title="Settings" description="Manage the tools available to your team." actions={
        <button className="prime-button secondary" onClick={handleLogout}>Sign out of admin</button>
      } />
      <div className="max-w-3xl">
        <h2 className="prime-heading text-4xl mb-6">Feature controls</h2>
        <div className="border-t border-prime-rule">
          {toggles.map(({ key, label, description }) => (
            <div key={key} className="flex justify-between items-center gap-6 border-b border-prime-rule py-7">
              <div><h3 className="prime-label text-prime-blue">{label}</h3><p className="text-sm mt-2">{description}</p></div>
              <button type="button" role="switch" aria-checked={settings[key]} aria-label={`Toggle ${label}`} disabled={isSaving} onClick={() => handleToggle(key)} className={`prime-button ${settings[key] ? "" : "secondary"}`}>
                {settings[key] ? "ON" : "OFF"}
              </button>
            </div>
          ))}
        </div>
        {saveMsg && <p role="status" className="prime-notice mt-6">{saveMsg}</p>}
      </div>
    </div>
  );
}
