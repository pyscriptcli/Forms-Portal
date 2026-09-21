"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { ClickUpUser } from "@/lib/auth";

interface AuthContextType {
  user: ClickUpUser | null;
  isLoading: boolean;
  signIn: (callbackUrl?: string) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  signIn: () => {},
  signOut: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ClickUpUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // The admin console has its own simple email/password gate and must not
    // initialize or depend on the ClickUp OAuth session.
    if (window.location.pathname.startsWith("/admin")) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    const demoRole = window.location.pathname === "/approver-view" ? "approver" : window.location.pathname === "/requestor-view" ? "requestor" : null;
    if (demoRole) {
      fetch(`/api/demo/status?role=${demoRole}`).then(async (res) => {
        if (!res.ok) throw new Error("Demo mode is disabled");
        setUser({ id: `demo-${demoRole}`, username: `Demo ${demoRole}`, email: `demo-${demoRole}@local.test`, role: demoRole as "approver" | "requestor", permissions: demoRole === "approver" ? ["forms", "requests", "approvals"] : ["forms", "requests"] });
      }).catch(() => setUser(null)).finally(() => setIsLoading(false));
      return;
    }
    // Local visual QA can use /form?preview=1 without requiring ClickUp OAuth.
    const isLocalPreview = new URLSearchParams(window.location.search).get("preview") === "1";
    if (isLocalPreview && process.env.NODE_ENV !== "production") {
      setUser({ id: "local-preview", username: "Local Preview", email: "preview@local.test" });
      setIsLoading(false);
      return;
    }

    // 1. Fast check client-side cookie
    const getCookie = (name: string) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(";").shift();
      return null;
    };

    const cachedUserCookie = getCookie("clickup_auth_user");
    if (cachedUserCookie) {
      try {
        setUser(JSON.parse(decodeURIComponent(cachedUserCookie)));
      } catch {
        // ignore
      }
    }

    // 2. Authoritative check against /api/auth/clickup/session
    fetch("/api/auth/clickup/session")
      .then((res) => res.json())
      .then((data) => {
        setUser(data.user || null);
      })
      .catch(() => {
        setUser(null);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const signIn = (callbackUrl = "/") => {
    window.location.href = `/api/auth/clickup/login?callbackUrl=${encodeURIComponent(callbackUrl)}`;
  };

  const signOut = () => {
    fetch("/api/auth/clickup/session", { method: "POST" }).then(() => {
      setUser(null);
      window.location.href = "/auth/signin";
    });
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
