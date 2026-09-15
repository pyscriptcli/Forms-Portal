export type UserRole = "admin" | "approver" | "finance" | "requestor";

export interface RoleDefinition {
  id: UserRole;
  name: string;
  badgeBg: string;
  badgeText: string;
  description: string;
  permissions: string[];
}

export const ROLE_DEFINITIONS: Record<UserRole, RoleDefinition> = {
  admin: {
    id: "admin",
    name: "Administrator",
    badgeBg: "#003366",
    badgeText: "#FFFFFF",
    description: "Full portal configuration, RBAC management, security controls, and feature toggles.",
    permissions: [
      "Manage RBAC & user role assignments",
      "Configure portal settings & AI models",
      "Access full audit trails & submissions",
      "Override approvals and workflows",
    ],
  },
  approver: {
    id: "approver",
    name: "Approver / Team Leader",
    badgeBg: "#5E3BEE",
    badgeText: "#FFFFFF",
    description: "Team leader review, department budget endorsement, and electronic signatures.",
    permissions: [
      "Review department RFP submissions",
      "Sign and endorse as Team Leader",
      "Reject or request revisions with remarks",
      "Approve urgent payment escalations",
    ],
  },
  finance: {
    id: "finance",
    name: "Finance & Accounting",
    badgeBg: "#134438",
    badgeText: "#FFFFFF",
    description: "Section 9 compliance verification, supporting document checks, and payment release.",
    permissions: [
      "Fill and complete Section 9 Finance checklist",
      "Validate invoice, SOA, contract, and receipts",
      "Schedule payment release dates",
      "Approve disbursement vouchers and release funds",
    ],
  },
  requestor: {
    id: "requestor",
    name: "Requestor / Staff",
    badgeBg: "#E3EEFD",
    badgeText: "#1E65D6",
    description: "Standard staff creation of payment requests, quotation uploads, and tracking.",
    permissions: [
      "Create and submit RFP forms",
      "Upload quotations and supporting documents",
      "Sign requestor authorization",
      "Track submission status and ClickUp queue",
    ],
  },
};

export interface UserAccessRecord {
  id: string;
  name: string;
  email: string;
  department: string;
  role: UserRole;
  status: "active" | "inactive";
  updatedAt?: string;
}

export const DEFAULT_USERS: UserAccessRecord[] = [
  {
    id: "usr-1",
    name: "Dave Policarpio",
    email: "dave@primephilippines.com",
    department: "Executive",
    role: "admin",
    status: "active",
  },
  {
    id: "usr-2",
    name: "Finance Officer",
    email: "finance@primephilippines.com",
    department: "Finance & Accounting",
    role: "finance",
    status: "active",
  },
  {
    id: "usr-3",
    name: "Department Team Leader",
    email: "tl.lead@primephilippines.com",
    department: "ISD",
    role: "approver",
    status: "active",
  },
  {
    id: "usr-4",
    name: "Operations Staff",
    email: "staff@primephilippines.com",
    department: "Operations",
    role: "requestor",
    status: "active",
  },
];

export const RBAC_STORAGE_KEY = "prime_rbac_users";

export function getLocalRbacUsers(): UserAccessRecord[] {
  if (typeof window === "undefined") return DEFAULT_USERS;
  try {
    const raw = localStorage.getItem(RBAC_STORAGE_KEY);
    if (!raw) return DEFAULT_USERS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_USERS;
  } catch {
    return DEFAULT_USERS;
  }
}

export function saveLocalRbacUsers(users: UserAccessRecord[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(RBAC_STORAGE_KEY, JSON.stringify(users));
}
