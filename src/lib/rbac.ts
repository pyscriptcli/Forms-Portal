export type UserRole = "admin" | "approver" | "finance" | "requestor";
export type PortalPermission = "forms" | "requests" | "approvals" | "settings";
export const PORTAL_PERMISSIONS: PortalPermission[] = ["forms", "requests", "approvals", "settings"];
export const DEFAULT_ACCESS_ID = "__default_access__";

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
  clickUpTaskId?: string;
  permissions?: PortalPermission[];
}

export interface RbacConfiguration {
  users: UserAccessRecord[];
  defaultPermissions: PortalPermission[];
}

export function roleFromPermissions(permissions: PortalPermission[]): UserRole {
  if (permissions.includes("settings")) return "admin";
  if (permissions.includes("approvals")) return "approver";
  return "requestor";
}


