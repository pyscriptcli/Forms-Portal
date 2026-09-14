export type AdminSettings = {
  portalGuideEnabled: boolean;
  rfpAutofillEnabled: boolean;
};

export const ADMIN_SETTINGS_KEY = "prime_admin_settings";
export const ADMIN_SESSION_KEY = "prime_admin_session";
export const ADMIN_EMAIL = "admin@primephilippines.com";
export const ADMIN_PASSWORD = "admin";
export const ADMIN_TOKEN = "prime-admin-token-v1"; // fixed token for prototype

export const DEFAULT_SETTINGS: AdminSettings = {
  portalGuideEnabled: true,
  rfpAutofillEnabled: true,
};

/** Read settings from localStorage (client-side only). Falls back to defaults. */
export function getAdminSettings(): AdminSettings {
  if (typeof window === "undefined") return { ...DEFAULT_SETTINGS };
  try {
    const raw = localStorage.getItem(ADMIN_SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    return {
      portalGuideEnabled:
        typeof parsed.portalGuideEnabled === "boolean"
          ? parsed.portalGuideEnabled
          : DEFAULT_SETTINGS.portalGuideEnabled,
      rfpAutofillEnabled:
        typeof parsed.rfpAutofillEnabled === "boolean"
          ? parsed.rfpAutofillEnabled
          : DEFAULT_SETTINGS.rfpAutofillEnabled,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

/** Persist settings to localStorage. */
export function saveAdminSettings(settings: AdminSettings): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ADMIN_SETTINGS_KEY, JSON.stringify(settings));
}

/** Check if the admin is currently authenticated (sessionStorage). */
export function isAdminAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(ADMIN_SESSION_KEY) === ADMIN_TOKEN;
}

/** Persist admin session (sessionStorage — clears on tab close). */
export function setAdminSession(): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(ADMIN_SESSION_KEY, ADMIN_TOKEN);
}

/** Clear admin session. */
export function clearAdminSession(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(ADMIN_SESSION_KEY);
}

/** Validate hardcoded credentials. */
export function validateAdminCredentials(email: string, password: string): boolean {
  return email.trim().toLowerCase() === ADMIN_EMAIL && password === ADMIN_PASSWORD;
}
