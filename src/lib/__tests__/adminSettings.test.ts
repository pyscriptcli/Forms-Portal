import { describe, it, expect, beforeEach } from "vitest";
import {
  getAdminSettings,
  saveAdminSettings,
  validateAdminCredentials,
  isAdminAuthenticated,
  setAdminSession,
  clearAdminSession,
  ADMIN_TOKEN,
  DEFAULT_SETTINGS,
} from "@/lib/adminSettings";

describe("adminSettings utilities", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  describe("getAdminSettings", () => {
    it("returns default settings when localStorage is empty", () => {
      const s = getAdminSettings();
      expect(s).toEqual(DEFAULT_SETTINGS);
    });

    it("returns parsed settings when saved in localStorage", () => {
      saveAdminSettings({ rfpAutofillEnabled: true });
      expect(getAdminSettings().rfpAutofillEnabled).toBe(true);
    });

    it("falls back to defaults for invalid JSON", () => {
      localStorage.setItem("prime_admin_settings", "not-json");
      expect(getAdminSettings()).toEqual(DEFAULT_SETTINGS);
    });
  });

  describe("saveAdminSettings", () => {
    it("persists settings to localStorage", () => {
      saveAdminSettings({ rfpAutofillEnabled: false });
      const raw = localStorage.getItem("prime_admin_settings");
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw!);
      expect(parsed.rfpAutofillEnabled).toBe(false);
    });
  });

  describe("validateAdminCredentials", () => {
    it("returns true for correct credentials", () => {
      expect(validateAdminCredentials("admin@primephilippines.com", "admin")).toBe(true);
    });

    it("is case-insensitive for email", () => {
      expect(validateAdminCredentials("ADMIN@PRIMEPHILIPPINES.COM", "admin")).toBe(true);
    });

    it("returns false for wrong password", () => {
      expect(validateAdminCredentials("admin@primephilippines.com", "wrongpass")).toBe(false);
    });

    it("returns false for wrong email", () => {
      expect(validateAdminCredentials("notadmin@example.com", "admin")).toBe(false);
    });
  });

  describe("admin session", () => {
    it("returns false when no session is set", () => {
      expect(isAdminAuthenticated()).toBe(false);
    });

    it("returns true after setAdminSession", () => {
      setAdminSession();
      expect(isAdminAuthenticated()).toBe(true);
    });

    it("returns false after clearAdminSession", () => {
      setAdminSession();
      clearAdminSession();
      expect(isAdminAuthenticated()).toBe(false);
    });
  });
});
