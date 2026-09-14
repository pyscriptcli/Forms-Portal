"use client";

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

  /* ── Login Gate ── */
  if (!authed) {
    return (
      <div className="min-h-screen bg-[#003366] flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white border border-slate-200 shadow-2xl">
          {/* Gold rule */}
          <div className="h-1 bg-[#C9A84C] w-full" />
          <div className="p-8">
            <div className="flex items-center gap-2.5 mb-6">
              <div className="w-8 h-8 bg-[#C9A84C] flex items-center justify-center font-serif font-black text-[#003366] text-base">
                P
              </div>
              <span
                className="font-serif italic font-bold text-2xl text-[#003366] tracking-tight leading-none"
                style={{ fontFamily: "var(--font-cormorant), 'Cormorant Garamond', Georgia, serif" }}
              >
                Admin
              </span>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                  placeholder="admin@..."
                  className="w-full h-9 px-3 bg-slate-50 border border-slate-300 text-xs focus:outline-none focus:border-[#003366] transition-colors"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full h-9 px-3 bg-slate-50 border border-slate-300 text-xs focus:outline-none focus:border-[#003366] transition-colors"
                />
              </div>

              {loginError && (
                <p role="alert" className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-3 py-2">
                  {loginError}
                </p>
              )}

              <button
                type="submit"
                className="w-full h-10 bg-[#003366] hover:bg-[#002244] text-white text-xs font-bold tracking-wide transition-colors"
              >
                Sign In
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  /* ── Admin Dashboard ── */
  const toggles: { key: keyof AdminSettings; label: string; description: string }[] = [
    {
      key: "portalGuideEnabled",
      label: "Portal Guide",
      description:
        "When off, the welcome banner, floating guide button, tour spotlight, and Tour nav link are completely removed from the UI — no trace left.",
    },
    {
      key: "rfpAutofillEnabled",
      label: "RFP AI Autofill",
      description:
        "When off, the quotation dropzone and extraction banner are hidden, and the /api/rfp/extract endpoint returns 403. Existing extracted data is preserved.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Admin topbar */}
      <header className="bg-[#003366] text-white px-6 h-14 flex items-center justify-between border-b border-[#002244]">
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#C9A84C]" />
        <div className="flex items-center gap-2.5">
          <Shield className="w-4 h-4 text-[#C9A84C]" />
          <span
            className="font-serif italic font-bold text-xl text-white tracking-tight"
            style={{ fontFamily: "var(--font-cormorant), 'Cormorant Garamond', Georgia, serif" }}
          >
            Admin Settings
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-xs font-semibold text-white/60 hover:text-white transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign Out
        </button>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10">
        <h1
          className="font-serif italic font-bold text-2xl text-[#003366] tracking-tight mb-1"
          style={{ fontFamily: "var(--font-cormorant), 'Cormorant Garamond', Georgia, serif" }}
        >
          Feature Controls
        </h1>
        <p className="text-xs text-slate-500 mb-8">
          Toggle portal features on or off. Changes take effect immediately for all users.
        </p>

        <div className="space-y-4">
          {toggles.map(({ key, label, description }) => (
            <div
              key={key}
              className="bg-white border border-slate-200 p-5 flex items-start justify-between gap-4 shadow-sm"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-bold text-slate-900">{label}</span>
                  <span
                    className={`text-[10px] font-bold uppercase px-1.5 py-0.5 ${
                      settings[key]
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-slate-100 text-slate-500 border border-slate-200"
                    }`}
                  >
                    {settings[key] ? "ON" : "OFF"}
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
              </div>
              <button
                type="button"
                onClick={() => handleToggle(key)}
                disabled={isSaving}
                aria-label={`Toggle ${label}`}
                className="shrink-0 mt-0.5 disabled:opacity-50 transition-opacity"
              >
                {settings[key] ? (
                  <ToggleRight className="w-8 h-8 text-[#003366]" />
                ) : (
                  <ToggleLeft className="w-8 h-8 text-slate-400" />
                )}
              </button>
            </div>
          ))}
        </div>

        {saveMsg && (
          <p className="mt-4 text-xs font-semibold text-slate-600 text-center">{saveMsg}</p>
        )}
      </main>
    </div>
  );
}
