export type FormDestinationKey = "rfp" | "gw-rfp" | "travel-budget" | "po" | "pcv";

export type FormDestination = {
  listId: string;
  workspaceId: string;
  label: string;
  enabled: boolean;
};

export type FormDestinations = Record<FormDestinationKey, FormDestination>;

export type WorkflowStatuses = {
  requestorFormSubmission: string;
  tlReviewAndApproval: string;
  financeValidation: string;
  financeProcessing: string;
  paymentPreparation: string;
  managementApproval: string;
  paymentRelease: string;
  paymentDocumentation: string;
  recordsFiling: string;
  revisionRequested: string;
};

export const DEFAULT_WORKFLOW_STATUSES: WorkflowStatuses = {
  requestorFormSubmission: "REQUESTOR FORM SUBMISSION",
  tlReviewAndApproval: "TL REVIEW AND APPROVAL",
  financeValidation: "FINANCE VALIDATION",
  financeProcessing: "FINANCE PROCESSING",
  paymentPreparation: "PAYMENT PREPARATION",
  managementApproval: "CFO/CEO SIGN-OFF",
  paymentRelease: "PAYMENT RELEASE",
  paymentDocumentation: "PAYMENT DOCUMENTATION",
  recordsFiling: "RECORDS FILING",
  revisionRequested: "REVISION REQUESTED",
};

export const DEFAULT_FORM_DESTINATIONS: FormDestinations = {
  rfp: {
    listId: "901420772915",
    workspaceId: "9014981136",
    label: "PRIME RFP submissions",
    enabled: true,
  },
  "gw-rfp": {
    listId: "901420772915",
    workspaceId: "9014981136",
    label: "GW RFP submissions",
    enabled: true,
  },
  "travel-budget": {
    listId: "901420772915",
    workspaceId: "9014981136",
    label: "Travel Budget requests",
    enabled: true,
  },
  po: {
    listId: "",
    workspaceId: "9014981136",
    label: "Purchase Order requests",
    enabled: true,
  },
  pcv: {
    listId: "",
    workspaceId: "9014981136",
    label: "Petty Cash Voucher requests",
    enabled: true,
  },
};

export type AdminSettings = {
  portalGuideEnabled: boolean;
  rfpAutofillEnabled: boolean;
  destinations?: FormDestinations;
  workflowStatuses?: WorkflowStatuses;
};

export const ADMIN_SETTINGS_KEY = "prime_admin_settings";
export const ADMIN_SESSION_KEY = "prime_admin_session";
export const ADMIN_EMAIL = "admin@primephilippines.com";
export const ADMIN_PASSWORD = "admin";
export const ADMIN_TOKEN = "prime-admin-token-v1"; // fixed token for prototype

export const DEFAULT_SETTINGS: AdminSettings = {
  portalGuideEnabled: true,
  rfpAutofillEnabled: true,
  destinations: DEFAULT_FORM_DESTINATIONS,
  workflowStatuses: DEFAULT_WORKFLOW_STATUSES,
};

export function getDefaultFormDestinations(): FormDestinations {
  return JSON.parse(JSON.stringify(DEFAULT_FORM_DESTINATIONS)) as FormDestinations;
}

export function normalizeFormDestinations(value: unknown): FormDestinations {
  const raw = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const normalized = getDefaultFormDestinations();

  for (const key of Object.keys(normalized) as FormDestinationKey[]) {
    const candidate = raw[key];
    if (!candidate || typeof candidate !== "object") continue;
    const item = candidate as Record<string, unknown>;
    normalized[key] = {
      listId: typeof item.listId === "string" ? item.listId.trim() : normalized[key].listId,
      workspaceId: typeof item.workspaceId === "string" ? item.workspaceId.trim() : normalized[key].workspaceId,
      label: typeof item.label === "string" && item.label.trim() ? item.label.trim() : normalized[key].label,
      enabled: typeof item.enabled === "boolean" ? item.enabled : normalized[key].enabled,
    };
  }

  return normalized;
}

export function normalizeWorkflowStatuses(value: unknown): WorkflowStatuses {
  const raw = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const legacyAliases: Record<string, string> = {
    "requestor form submission": DEFAULT_WORKFLOW_STATUSES.requestorFormSubmission,
    "submitted": DEFAULT_WORKFLOW_STATUSES.requestorFormSubmission,
    "tl review and approval": DEFAULT_WORKFLOW_STATUSES.tlReviewAndApproval,
    "for tl approval": DEFAULT_WORKFLOW_STATUSES.tlReviewAndApproval,
    "finance validation": DEFAULT_WORKFLOW_STATUSES.financeValidation,
    "finance verification": DEFAULT_WORKFLOW_STATUSES.financeValidation,
    "finance processing": DEFAULT_WORKFLOW_STATUSES.financeProcessing,
    "payment preparation": DEFAULT_WORKFLOW_STATUSES.paymentPreparation,
    "disbursement prep": DEFAULT_WORKFLOW_STATUSES.paymentPreparation,
    "cfo/ceo review and sign-off": DEFAULT_WORKFLOW_STATUSES.managementApproval,
    "executive sign off": DEFAULT_WORKFLOW_STATUSES.managementApproval,
    "payment release": DEFAULT_WORKFLOW_STATUSES.paymentRelease,
    "payment documentation": DEFAULT_WORKFLOW_STATUSES.paymentDocumentation,
    "records filing": DEFAULT_WORKFLOW_STATUSES.recordsFiling,
    "completed": DEFAULT_WORKFLOW_STATUSES.recordsFiling,
    "revision requested": DEFAULT_WORKFLOW_STATUSES.revisionRequested,
  };
  return Object.fromEntries(
    Object.entries(DEFAULT_WORKFLOW_STATUSES).map(([key, fallback]) => [
      key,
      typeof raw[key] === "string" && raw[key].trim()
        ? legacyAliases[raw[key].trim().toLowerCase()] || raw[key].trim()
        : fallback,
    ])
  ) as WorkflowStatuses;
}

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
      destinations: normalizeFormDestinations(parsed.destinations),
      workflowStatuses: normalizeWorkflowStatuses(parsed.workflowStatuses),
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
