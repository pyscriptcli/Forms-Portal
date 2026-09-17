"use client";
import { PageHeader } from "@/components/PageHeader";
import { PrimeLogo } from "@/components/PrimeLogo";

import React, { useState, useEffect } from "react";
import {
  ToggleLeft,
  ToggleRight,
  LogOut,
  Shield,
  Users,
  UserCheck,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  RefreshCw,
  Database,
  Webhook,
  Clock,
  AlertTriangle,
  Check,
} from "lucide-react";

export const CONTRACT_FIELD_GROUPS = [
  {
    title: "1. Core Request Metadata (9 Fields)",
    description: "Populated automatically upon submission and approval.",
    fields: [
      { name: "RFP ID", type: "Short Text", desc: "Sequential request ID (e.g. RFP-092026-0001)" },
      { name: "RFP Entity", type: "Short Text", desc: "Entity name (e.g. PRIME, GW)" },
      { name: "RFP Department", type: "Short Text", desc: "Requesting department (e.g. Accounting, ISD)" },
      { name: "RFP Amount", type: "Currency / Number", desc: "Total payable amount in PHP" },
      { name: "RFP Purpose", type: "Text", desc: "Itemized purpose or particulars" },
      { name: "RFP Requestor Name", type: "Short Text", desc: "Full name of requestor" },
      { name: "RFP Requestor Email", type: "Email / Text", desc: "Corporate email of requestor" },
      { name: "RFP Approver Name", type: "Short Text", desc: "Full name of approving Team Leader" },
      { name: "RFP Approver Email", type: "Email / Text", desc: "Corporate email of approving Team Leader" },
    ],
  },
  {
    title: "2. Milestone Timestamps (10 Fields)",
    description: "Populated with authoritative event times when status transitions occur.",
    fields: [
      { name: "RFP TS - Requestor Form Submission", type: "Date & Time", desc: "Submission event timestamp" },
      { name: "RFP TS - TL Review and Approval", type: "Date & Time", desc: "TL Approval event timestamp" },
      { name: "RFP TS - Finance Validation", type: "Date & Time", desc: "Finance Validation milestone timestamp" },
      { name: "RFP TS - Finance Processing", type: "Date & Time", desc: "Finance Processing milestone timestamp" },
      { name: "RFP TS - Payment Preparation", type: "Date & Time", desc: "Payment Preparation milestone timestamp" },
      { name: "RFP TS - CFO CEO Sign-Off", type: "Date & Time", desc: "Executive sign-off milestone timestamp" },
      { name: "RFP TS - Payment Release", type: "Date & Time", desc: "Disbursement milestone timestamp" },
      { name: "RFP TS - Payment Documentation", type: "Date & Time", desc: "Documentation milestone timestamp" },
      { name: "RFP TS - Records Filing", type: "Date & Time", desc: "Final filing milestone timestamp" },
      { name: "RFP Revision Requested At", type: "Date & Time", desc: "Timestamp of the latest revision request" },
    ],
  },
  {
    title: "3. Process Audit & Idempotency (3 Fields)",
    description: "Enforces single-write idempotency and stores revision history.",
    fields: [
      { name: "RFP Revision Requested By", type: "Short Text", desc: "User or role who returned the request" },
      { name: "RFP Last Status Event ID", type: "Short Text", desc: "Webhook event ID to prevent duplicate writes" },
      { name: "RFP Process History", type: "Text / Long Text", desc: "Audit log of all milestone timestamps & events" },
    ],
  },
];
import {
  validateAdminCredentials,
  isAdminAuthenticated,
  setAdminSession,
  clearAdminSession,
  ADMIN_TOKEN,
  type AdminSettings,
  type FormDestinationKey,
  type FormDestinations,
  type WorkflowStatuses,
} from "@/lib/adminSettings";
import {
  ROLE_DEFINITIONS,
  DEFAULT_USERS,
  type UserAccessRecord,
  type UserRole,
} from "@/lib/rbac";

const DEFAULT_FORM_DESTINATIONS: FormDestinations = {
  rfp: { listId: "901420772915", workspaceId: "9014981136", label: "PRIME RFP submissions", enabled: true },
  "gw-rfp": { listId: "901420772915", workspaceId: "9014981136", label: "GW RFP submissions", enabled: true },
  "travel-budget": { listId: "901420772915", workspaceId: "9014981136", label: "Travel Budget requests", enabled: true },
};

const DEFAULT_WORKFLOW_STATUSES: WorkflowStatuses = {
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

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<"features" | "destinations" | "workflow" | "rbac">("features");
  const [authed, setAuthed] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [settings, setSettings] = useState<AdminSettings>({
    rfpAutofillEnabled: true,
    destinations: DEFAULT_FORM_DESTINATIONS,
  });
  const [destinations, setDestinations] = useState<FormDestinations>(DEFAULT_FORM_DESTINATIONS);
  const [workflowStatuses, setWorkflowStatuses] = useState<WorkflowStatuses>(DEFAULT_WORKFLOW_STATUSES);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  // RBAC State
  const [users, setUsers] = useState<UserAccessRecord[]>(DEFAULT_USERS);
  const [isSavingRbac, setIsSavingRbac] = useState(false);
  const [isRefreshingRbac, setIsRefreshingRbac] = useState(false);
  const [rbacSaveMsg, setRbacSaveMsg] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserDept, setNewUserDept] = useState("ISD");
  const [newUserRole, setNewUserRole] = useState<UserRole>("requestor");

  const loadRbacData = async () => {
    setIsRefreshingRbac(true);
    try {
      const res = await fetch("/api/admin/rbac");
      const data = await res.json();
      if (data && Array.isArray(data.users)) {
        setUsers(data.users);
      }
    } catch {
      setRbacSaveMsg("Could not load shared Supabase RBAC configuration.");
    } finally {
      setIsRefreshingRbac(false);
    }
  };

  // ClickUp Custom Fields Contract State
  const [contractStatus, setContractStatus] = useState<{
    isChecking: boolean;
    isRegisteringWebhook: boolean;
    isSyncingTimestamps: boolean;
    message: string;
    isError: boolean;
    mappedCount?: number;
    totalExpected?: number;
    mapping: Record<string, string>;
    webhookInfo?: { endpoint: string; webhookId?: string };
  }>({
    isChecking: false,
    isRegisteringWebhook: false,
    isSyncingTimestamps: false,
    message: "",
    isError: false,
    mapping: {},
  });

  const loadClickUpContract = async () => {
    try {
      const res = await fetch("/api/admin/clickup-fields");
      const data = await res.json();
      if (data && data.success && data.mapping) {
        setContractStatus((prev) => ({
          ...prev,
          mappedCount: data.validation?.mappedCount,
          totalExpected: data.validation?.totalExpected,
          mapping: data.mapping,
        }));
      }
    } catch {
      // Ignore
    }
  };

  async function handleDiscoverContractFields() {
    setContractStatus((prev) => ({ ...prev, isChecking: true, message: "", isError: false }));
    try {
      const res = await fetch("/api/admin/clickup-fields", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": ADMIN_TOKEN,
        },
        body: JSON.stringify({ action: "discover_and_save" }),
      });
      const data = await res.json();
      if (data && data.success) {
        setContractStatus((prev) => ({
          ...prev,
          isChecking: false,
          message: data.message || "Contract fields discovered and updated.",
          mappedCount: data.validation?.mappedCount,
          totalExpected: data.validation?.totalExpected,
          mapping: data.mapping || {},
        }));
      } else {
        setContractStatus((prev) => ({
          ...prev,
          isChecking: false,
          message: data?.message || "Failed to discover custom fields.",
          isError: true,
        }));
      }
    } catch (err: any) {
      setContractStatus((prev) => ({
        ...prev,
        isChecking: false,
        message: err.message || "Network error discovering fields.",
        isError: true,
      }));
    }
  }

  async function handleSyncTaskTimestamps() {
    setContractStatus((prev) => ({ ...prev, isSyncingTimestamps: true, message: "", isError: false }));
    try {
      const res = await fetch("/api/admin/clickup-fields", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": ADMIN_TOKEN,
        },
        body: JSON.stringify({ action: "sync_task_timestamps" }),
      });
      const data = await res.json();
      if (data && data.success) {
        setContractStatus((prev) => ({
          ...prev,
          isSyncingTimestamps: false,
          message: data.message || "Task milestone timestamps synchronized successfully.",
        }));
      } else {
        setContractStatus((prev) => ({
          ...prev,
          isSyncingTimestamps: false,
          message: data?.message || "Failed to sync task timestamps.",
          isError: true,
        }));
      }
    } catch (err: any) {
      setContractStatus((prev) => ({
        ...prev,
        isSyncingTimestamps: false,
        message: err.message || "Network error syncing task timestamps.",
        isError: true,
      }));
    }
  }

  async function handleRegisterWebhook() {
    setContractStatus((prev) => ({ ...prev, isRegisteringWebhook: true, message: "", isError: false }));
    try {
      const res = await fetch("/api/admin/clickup-fields", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": ADMIN_TOKEN,
        },
        body: JSON.stringify({ action: "create_webhook" }),
      });
      const data = await res.json();
      if (data && data.success) {
        setContractStatus((prev) => ({
          ...prev,
          isRegisteringWebhook: false,
          message: data.message || "ClickUp webhook registered successfully.",
          webhookInfo: { endpoint: data.endpoint, webhookId: data.webhookId },
        }));
      } else {
        setContractStatus((prev) => ({
          ...prev,
          isRegisteringWebhook: false,
          message: data?.message || "Failed to register webhook.",
          isError: true,
        }));
      }
    } catch (err: any) {
      setContractStatus((prev) => ({
        ...prev,
        isRegisteringWebhook: false,
        message: err.message || "Network error registering webhook.",
        isError: true,
      }));
    }
  }

  useEffect(() => {
    if (isAdminAuthenticated()) {
      setAuthed(true);
      // Load latest flags from server
      fetch("/api/admin/settings")
        .then((r) => r.json())
        .then((flags) => {
          if (flags && typeof flags === "object") {
            setSettings(flags);
            if (flags.destinations) setDestinations(flags.destinations);
            if (flags.workflowStatuses) setWorkflowStatuses(flags.workflowStatuses);
          }
        })
        .catch(() => {
          setSaveMsg("Could not load shared Supabase configuration.");
        });

      // Load RBAC users from the server-side RBAC database
      loadRbacData();

      // Load ClickUp contract field mapping
      loadClickUpContract();
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

  async function handleToggle(key: "rfpAutofillEnabled") {
    const updated = { ...settings, [key]: !settings[key] };
    setSettings(updated);
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
    } catch (error: any) {
      setSaveMsg(error?.message || "Error saving feature settings.");
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMsg(""), 2500);
    }
  }

  function updateDestination(key: FormDestinationKey, field: keyof FormDestinations[FormDestinationKey], value: string | boolean) {
    setDestinations((current) => ({
      ...current,
      [key]: { ...current[key], [field]: value },
    }));
  }

  async function handleSaveDestinations() {
    setIsSaving(true);
    setSaveMsg("");
    const updated = { ...settings, destinations };
    setSettings(updated);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": ADMIN_TOKEN,
        },
        body: JSON.stringify({ destinations }),
      });
      if (!res.ok) throw new Error("Save failed");
      setSaveMsg("Form destinations saved.");
    } catch (error: any) {
      setSaveMsg(error?.message || "Error saving form destinations.");
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMsg(""), 3000);
    }
  }

  async function handleSaveWorkflowStatuses() {
    setIsSaving(true);
    setSaveMsg("");
    const updated = { ...settings, workflowStatuses };
    setSettings(updated);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": ADMIN_TOKEN,
        },
        body: JSON.stringify({ workflowStatuses }),
      });
      if (!res.ok) throw new Error("Save failed");
      setSaveMsg("Workflow statuses saved.");
    } catch {
      setSaveMsg("Error saving — changes applied locally only.");
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMsg(""), 3000);
    }
  }

  const handleRoleChange = (userId: string, newRole: UserRole) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
    );
  };

  const handleStatusToggle = (userId: string) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? { ...u, status: u.status === "active" ? "inactive" : "active" }
          : u
      )
    );
  };

  const handleDeleteUser = (userId: string) => {
    if (users.length <= 1) {
      alert("At least one user must remain in the directory.");
      return;
    }
    setUsers((prev) => prev.filter((u) => u.id !== userId));
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) return;

    const newUser: UserAccessRecord = {
      id: `usr-${Date.now()}`,
      name: newUserName.trim(),
      email: newUserEmail.trim(),
      department: newUserDept.trim() || "Operations",
      role: newUserRole,
      status: "active",
      updatedAt: new Date().toISOString(),
    };

    setUsers((prev) => [...prev, newUser]);
    setNewUserName("");
    setNewUserEmail("");
    setNewUserDept("ISD");
    setNewUserRole("requestor");
  };

  const handleSaveRbac = async () => {
    setIsSavingRbac(true);
    setRbacSaveMsg("");
    try {
      const res = await fetch("/api/admin/rbac", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": ADMIN_TOKEN,
        },
        body: JSON.stringify({ users }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save RBAC settings");

      if (data.users && Array.isArray(data.users)) {
        setUsers(data.users);
      }

      setRbacSaveMsg("Role assignments saved to Supabase.");
    } catch (err: any) {
      setRbacSaveMsg(err?.message || "Could not save RBAC configuration to Supabase.");
    } finally {
      setIsSavingRbac(false);
      setTimeout(() => setRbacSaveMsg(""), 4500);
    }
  };

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
  const toggles: { key: "rfpAutofillEnabled"; label: string; description: string }[] = [
    {
      key: "rfpAutofillEnabled",
      label: "RFP AI Autofill",
      description:
        "Allow requestors to fill payment forms from a vendor quotation.",
    },
  ];

  const roleEntries = Object.values(ROLE_DEFINITIONS);

  return (
    <div className="prime-page pb-20">
      <PageHeader
        title="Settings"
        description="Manage portal features, user roles, and access control."
        actions={
          <button className="prime-button secondary" onClick={handleLogout}>
            Sign out of admin
          </button>
        }
      />

      <div className="max-w-4xl">
        <div role="tablist" aria-label="Admin settings sections" className="mb-8 flex flex-wrap gap-2 border-b border-prime-rule">
          {([
            ["features", "Features"],
            ["destinations", "Form destinations"],
            ["workflow", "Workflow statuses"],
            ["rbac", "Role-Based Access Control (RBAC)"],
          ] as [typeof activeTab, string][]).map(([tab, label]) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              aria-controls={`admin-tabpanel-${tab}`}
              onClick={() => setActiveTab(tab)}
              className={`border-b-2 px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] transition-colors ${
                activeTab === tab
                  ? "border-prime-blue text-prime-blue"
                  : "border-transparent text-prime-ink/60 hover:border-prime-rule hover:text-prime-blue"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {activeTab === "features" && <div id="admin-tabpanel-features" role="tabpanel" aria-label="Feature controls">
        {/* ========================================================================= */}
        {/* FEATURE CONTROLS */}
        {/* ========================================================================= */}
        <section>
          <h2 className="prime-heading text-4xl mb-6">Feature controls</h2>
          <div className="border-t border-prime-rule">
            {toggles.map(({ key, label, description }) => (
              <div key={key} className="flex justify-between items-center gap-6 border-b border-prime-rule py-7">
                <div>
                  <h3 className="prime-label text-prime-blue">{label}</h3>
                  <p className="text-sm mt-2 text-prime-ink/80">{description}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={settings[key]}
                  aria-label={`Toggle ${label}`}
                  disabled={isSaving}
                  onClick={() => handleToggle(key)}
                  className={`prime-button ${settings[key] ? "" : "secondary"}`}
                >
                  {settings[key] ? "ON" : "OFF"}
                </button>
              </div>
            ))}
          </div>
          {saveMsg && <p role="status" className="prime-notice mt-6">{saveMsg}</p>}
        </section>
        </div>}

        {activeTab === "destinations" && <div id="admin-tabpanel-destinations" role="tabpanel" aria-label="Form destinations">
        {/* ========================================================================= */}
        {/* FORM DESTINATIONS */}
        {/* ========================================================================= */}
        <section className="pt-6 border-t border-prime-rule">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-5">
            <div>
              <h2 className="prime-heading text-3xl">Form destinations</h2>
              <p className="text-sm text-prime-ink/80 mt-1">
                Choose the ClickUp List that receives each form submission. PRIME RFP defaults to List 901420772915.
              </p>
            </div>
            <button
              type="button"
              onClick={handleSaveDestinations}
              disabled={isSaving}
              className="prime-button flex items-center justify-center gap-2 shrink-0"
            >
              <Save className="w-4 h-4" />
              {isSaving ? "Saving..." : "Save destinations"}
            </button>
          </div>

          <div className="overflow-x-auto border border-prime-rule">
            <table className="w-full text-left text-sm">
              <thead className="bg-prime-surface/50">
                <tr className="border-b border-prime-rule">
                  <th className="p-3 font-semibold">Form</th>
                  <th className="p-3 font-semibold">ClickUp List ID</th>
                  <th className="p-3 font-semibold">Workspace ID</th>
                  <th className="p-3 font-semibold">Enabled</th>
                </tr>
              </thead>
              <tbody>
                {([
                  ["rfp", "PRIME RFP"],
                  ["gw-rfp", "GW RFP"],
                  ["travel-budget", "Travel Budget Request"],
                ] as [FormDestinationKey, string][]).map(([key, label]) => (
                  <tr key={key} className="border-b border-prime-rule last:border-b-0">
                    <td className="p-3 font-medium whitespace-nowrap">{label}</td>
                    <td className="p-3 min-w-48">
                      <input
                        aria-label={`${label} ClickUp List ID`}
                        value={destinations[key].listId}
                        onChange={(e) => updateDestination(key, "listId", e.target.value)}
                        className="prime-field font-mono text-sm"
                        placeholder="ClickUp List ID"
                      />
                    </td>
                    <td className="p-3 min-w-44">
                      <input
                        aria-label={`${label} Workspace ID`}
                        value={destinations[key].workspaceId}
                        onChange={(e) => updateDestination(key, "workspaceId", e.target.value)}
                        className="prime-field font-mono text-sm"
                        placeholder="Workspace ID"
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="checkbox"
                        aria-label={`Enable ${label}`}
                        checked={destinations[key].enabled}
                        onChange={(e) => updateDestination(key, "enabled", e.target.checked)}
                        className="h-4 w-4 accent-prime-blue"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        </div>}

        {activeTab === "workflow" && <div id="admin-tabpanel-workflow" role="tabpanel" aria-label="Workflow statuses">
        <section>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-5">
            <div>
              <h2 className="prime-heading text-3xl">Workflow statuses</h2>
              <p className="text-sm text-prime-ink/80 mt-1">
                Match these values exactly to the statuses configured in the destination ClickUp List.
              </p>
            </div>
            <button
              type="button"
              onClick={handleSaveWorkflowStatuses}
              disabled={isSaving}
              className="prime-button flex items-center justify-center gap-2 shrink-0"
            >
              <Save className="w-4 h-4" />
              {isSaving ? "Saving..." : "Save workflow statuses"}
            </button>
          </div>

          <div className="border border-prime-rule divide-y divide-prime-rule">
            {([
              ["requestorFormSubmission", "REQUESTOR FORM SUBMISSION", "Initial status after a requestor submits"],
              ["tlReviewAndApproval", "TL REVIEW AND APPROVAL", "Team leader review milestone"],
              ["financeValidation", "FINANCE VALIDATION", "Finance validation milestone"],
              ["financeProcessing", "FINANCE PROCESSING", "Finance processing milestone"],
              ["paymentPreparation", "PAYMENT PREPARATION", "Payment preparation milestone"],
              ["managementApproval", "CFO/CEO SIGN-OFF", "Management approval milestone"],
              ["paymentRelease", "PAYMENT RELEASE", "Payment release milestone"],
              ["paymentDocumentation", "PAYMENT DOCUMENTATION", "Payment documentation milestone"],
              ["recordsFiling", "RECORDS FILING", "Final completed milestone"],
              ["revisionRequested", "REVISION REQUESTED", "Paused revision status"],
            ] as [keyof WorkflowStatuses, string, string][]).map(([key, label, description]) => (
              <label key={key} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-8 p-4">
                <span className="sm:w-48 shrink-0">
                  <span className="block text-sm font-semibold text-prime-ink">{label}</span>
                  <span className="block text-xs text-prime-ink/60 mt-1">{description}</span>
                </span>
                <input
                  aria-label={`${label} ClickUp status`}
                  value={workflowStatuses[key]}
                  onChange={(e) => setWorkflowStatuses((current) => ({ ...current, [key]: e.target.value }))}
                  className="prime-field flex-1 font-mono text-sm"
                  required
                />
              </label>
            ))}
          </div>
          {saveMsg && <p role="status" className="prime-notice mt-6">{saveMsg}</p>}
        </section>

        {/* ========================================================================= */}
        {/* CLICKUP CUSTOM FIELDS CONTRACT & MILESTONE TIMESTAMPS */}
        {/* ========================================================================= */}
        <section className="mt-12 pt-10 border-t border-prime-rule">
          <div className="grid gap-5 mb-6">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-prime-blue" />
                <h2 className="prime-heading text-3xl">ClickUp Custom Fields Contract</h2>
              </div>
              <p className="text-sm text-prime-ink/80 mt-1 max-w-2xl">
                Binds the 22 canonical contract fields (metadata, milestone timestamps, audit) to your ClickUp list for real-time tracking, audit history, and exact milestone dates.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <button
                type="button"
                onClick={handleDiscoverContractFields}
                disabled={contractStatus.isChecking}
                className="prime-button secondary flex items-center justify-center gap-1.5 h-[38px] px-3.5 text-xs cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${contractStatus.isChecking ? "animate-spin" : ""}`} />
                {contractStatus.isChecking ? "Scanning Fields..." : "Discover & Map Fields"}
              </button>
              <button
                type="button"
                onClick={handleRegisterWebhook}
                disabled={contractStatus.isRegisteringWebhook}
                className="prime-button flex items-center justify-center gap-1.5 h-[38px] px-3.5 text-xs cursor-pointer"
              >
                <Webhook className={`w-3.5 h-3.5 ${contractStatus.isRegisteringWebhook ? "animate-spin" : ""}`} />
                {contractStatus.isRegisteringWebhook ? "Registering..." : "Register Status Webhook"}
              </button>
              <button
                type="button"
                onClick={handleSyncTaskTimestamps}
                disabled={contractStatus.isSyncingTimestamps}
                className="prime-button secondary flex items-center justify-center gap-1.5 h-[38px] px-3.5 text-xs cursor-pointer"
              >
                <Clock className={`w-3.5 h-3.5 ${contractStatus.isSyncingTimestamps ? "animate-spin" : ""}`} />
                {contractStatus.isSyncingTimestamps ? "Syncing Tasks..." : "Sync Missing Timestamps"}
              </button>
            </div>
          </div>

          <div className="mb-6 border border-prime-rule bg-prime-surface/30 p-4">
            <div className="flex items-start gap-3">
              <Database className="mt-0.5 h-5 w-5 shrink-0 text-prime-blue" />
              <div>
                <h3 className="text-sm font-semibold text-prime-blue">One-time administrator setup</h3>
                <ol className="mt-2 grid gap-2 text-xs text-prime-ink/80 sm:grid-cols-3">
                  <li><strong>1. Discover:</strong> map the contract fields already created in the RFP ClickUp List.</li>
                  <li><strong>2. Register:</strong> connect status changes to the portal webhook.</li>
                  <li><strong>3. Sync:</strong> backfill timestamps for existing test requests.</li>
                </ol>
                <p className="mt-3 text-xs font-medium text-prime-blue">Saved configuration is shared server-side. Requestors and approvers do not configure anything.</p>
              </div>
            </div>
          </div>

          {/* Status feedback message */}
          {contractStatus.message && (
            <div
              className={`mb-6 p-4 border text-xs flex items-center gap-3 ${
                contractStatus.isError
                  ? "bg-red-50 border-red-200 text-red-800"
                  : "bg-emerald-50 border-emerald-200 text-emerald-800"
              }`}
            >
              {contractStatus.isError ? (
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
              ) : (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              )}
              <span>{contractStatus.message}</span>
            </div>
          )}

          {/* Webhook info banner */}
          {contractStatus.webhookInfo && (
            <div className="mb-6 p-3 bg-prime-surface/40 border border-prime-rule flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <Webhook className="w-4 h-4 text-prime-blue shrink-0" />
                <span>
                  <strong>Active Webhook:</strong>{" "}
                  <code className="font-mono bg-prime-white px-1.5 py-0.5 border border-prime-rule">
                    {contractStatus.webhookInfo.endpoint}
                  </code>
                </span>
              </div>
              {contractStatus.webhookInfo.webhookId && (
                <span className="text-prime-ink/60 font-mono text-[11px]">
                  ID: {contractStatus.webhookInfo.webhookId}
                </span>
              )}
            </div>
          )}

          {/* Mapping Progress Indicator */}
          <div className="mb-6 p-4 bg-prime-surface/30 border border-prime-rule flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
            <div>
              <div className="font-semibold text-prime-ink">
                Contract Synchronization Status
              </div>
              <p className="text-prime-ink/70 mt-0.5">
                {contractStatus.mappedCount !== undefined
                  ? `${contractStatus.mappedCount} of ${contractStatus.totalExpected ?? 22} contract fields mapped`
                  : `${Object.keys(settings.clickupFieldMapping || {}).length} contract fields mapped`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ${
                  (contractStatus.mappedCount ?? Object.keys(settings.clickupFieldMapping || {}).length) >= 22
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {(contractStatus.mappedCount ?? Object.keys(settings.clickupFieldMapping || {}).length) >= 22 ? (
                  <>
                    <Check className="w-3 h-3" /> Fully Mapped
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3 h-3" />
                    {22 - (contractStatus.mappedCount ?? Object.keys(settings.clickupFieldMapping || {}).length)} Missing
                  </>
                )}
              </span>
            </div>
          </div>

          {/* Field Tables by Group */}
          <div className="space-y-8">
            {CONTRACT_FIELD_GROUPS.map((group) => (
              <div key={group.title} className="border border-prime-rule">
                <div className="bg-prime-surface/40 px-4 py-3 border-b border-prime-rule">
                  <h3 className="font-semibold text-sm text-prime-ink">{group.title}</h3>
                  <p className="text-xs text-prime-ink/70 mt-0.5">{group.description}</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-prime-rule bg-prime-surface/20 text-prime-ink/80 font-medium">
                        <th className="p-3 w-1/3">Field Name</th>
                        <th className="p-3 w-1/6">ClickUp Type</th>
                        <th className="p-3">Description</th>
                        <th className="p-3 text-right">Status / Field ID</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-prime-rule">
                      {group.fields.map((f) => {
                        const activeMapping = {
                          ...(settings.clickupFieldMapping || {}),
                          ...(contractStatus.mapping || {}),
                        };
                        const fieldId = activeMapping[f.name];
                        const isMapped = Boolean(fieldId);

                        return (
                          <tr key={f.name} className="hover:bg-prime-surface/10 transition-colors">
                            <td className="p-3 font-semibold text-prime-ink">{f.name}</td>
                            <td className="p-3 font-mono text-[11px] text-prime-ink/70">{f.type}</td>
                            <td className="p-3 text-prime-ink/80">{f.desc}</td>
                            <td className="p-3 text-right whitespace-nowrap">
                              {isMapped ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-mono font-medium">
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  {fieldId}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-medium">
                                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                                  Not found
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </section>
        </div>}

        {activeTab === "rbac" && <div id="admin-tabpanel-rbac" role="tabpanel" aria-label="Role-Based Access Control">
        {/* ========================================================================= */}
        {/* ROLE-BASED ACCESS CONTROL (RBAC) */}
        {/* ========================================================================= */}
        <section className="pt-6 border-t border-prime-rule">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <Shield className="w-6 h-6 text-prime-blue" />
                <h2 className="prime-heading text-3xl">Role-Based Access Control (RBAC)</h2>
              </div>
              <p className="text-sm text-prime-ink/80 mt-1">
                Define user permissions and control access to approvals, sign-offs, and payment releases.
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={loadRbacData}
                disabled={isRefreshingRbac}
                title="Refresh users from Supabase"
                className="prime-button secondary flex items-center justify-center gap-1.5 h-[38px] px-3 text-xs cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingRbac ? "animate-spin" : ""}`} />
                {isRefreshingRbac ? "Syncing..." : "Sync"}
              </button>
              <button
                type="button"
                onClick={handleSaveRbac}
                disabled={isSavingRbac}
                className="prime-button flex items-center justify-center gap-2 shrink-0 h-[38px] cursor-pointer"
              >
                <Save className="w-4 h-4" />
                {isSavingRbac ? "Saving..." : "Save Role Assignments"}
              </button>
            </div>
          </div>

          {/* Local Database Indicator Banner */}
          <div className="mb-6 p-3 bg-prime-surface/40 border border-prime-rule flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <Database className="w-4 h-4 text-prime-blue shrink-0" />
              <div>
                <span className="font-bold text-prime-blue">RBAC Database:</span>{" "}
                <span className="font-mono text-prime-ink/80">forms-portal-RBAC</span>
                <span className="ml-2 inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
                  Local storage
                </span>
              </div>
            </div>
          </div>

          {rbacSaveMsg && (
            <div role="status" className="prime-notice mb-6 flex items-center gap-2 bg-emerald-50 text-emerald-800 border-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{rbacSaveMsg}</span>
            </div>
          )}

          {/* Role Definitions Matrix */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {roleEntries.map((role) => (
              <div
                key={role.id}
                className="bg-white border border-prime-rule p-4 rounded-none shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider text-white"
                      style={{ backgroundColor: role.badgeBg, color: role.badgeText }}
                    >
                      {role.name}
                    </span>
                  </div>
                  <p className="text-xs text-prime-ink/80 mb-3">{role.description}</p>
                </div>
                <div>
                  <h4 className="text-[11px] font-bold text-prime-blue uppercase tracking-wider mb-1.5 border-t border-prime-rule/50 pt-2">
                    Permissions:
                  </h4>
                  <ul className="space-y-1">
                    {role.permissions.map((p, idx) => (
                      <li key={idx} className="text-[11px] text-prime-ink/75 flex items-start gap-1">
                        <span className="text-prime-blue shrink-0">•</span>
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>

          {/* User Access Management Table */}
          <div className="bg-white border border-prime-rule shadow-sm mb-6">
            <div className="p-4 border-b border-prime-rule bg-prime-surface/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-prime-blue" />
                <h3 className="font-bold text-sm text-prime-ink">Team Access & Assigned Roles</h3>
              </div>
              <span className="text-xs text-prime-ink/60">{users.length} configured members</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-prime-rule bg-prime-surface/20 text-prime-blue font-bold uppercase text-[10px] tracking-wider">
                    <th className="p-3">Member</th>
                    <th className="p-3">Department</th>
                    <th className="p-3">Assigned Role</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-prime-rule/60">
                  {users.map((u) => {
                    return (
                      <tr key={u.id} className="hover:bg-prime-surface/10 transition-colors">
                        <td className="p-3">
                          <div className="font-semibold text-prime-ink">{u.name}</div>
                          <div className="text-[11px] text-prime-ink/60 font-mono">{u.email}</div>
                        </td>
                        <td className="p-3 font-medium text-prime-ink/80">{u.department}</td>
                        <td className="p-3">
                          <select
                            value={u.role}
                            onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                            className="text-xs font-semibold py-1 px-2 border border-prime-rule bg-white focus:outline-none focus:border-prime-blue cursor-pointer"
                          >
                            <option value="admin">Administrator</option>
                            <option value="approver">Approver / TL</option>
                            <option value="finance">Finance & Accounting</option>
                            <option value="requestor">Requestor / Staff</option>
                          </select>
                        </td>
                        <td className="p-3">
                          <button
                            type="button"
                            onClick={() => handleStatusToggle(u.id)}
                            className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-none cursor-pointer ${
                              u.status === "active"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {u.status}
                          </button>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(u.id)}
                            title="Remove user"
                            className="text-prime-ink/40 hover:text-red-600 p-1 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4 inline" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Add Team Member */}
          <div className="bg-prime-surface/30 border border-dashed border-prime-rule p-4">
            <h4 className="text-xs font-bold text-prime-blue uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Add Team Member
            </h4>
            <form onSubmit={handleAddUser} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
              <div>
                <label className="block text-[10px] font-semibold text-prime-ink/70 mb-1">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Maria Santos"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full text-xs p-2 border border-prime-rule bg-white focus:outline-none focus:border-prime-blue"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-prime-ink/70 mb-1">Email</label>
                <input
                  type="email"
                  placeholder="maria@primephilippines.com"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full text-xs p-2 border border-prime-rule bg-white focus:outline-none focus:border-prime-blue"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-prime-ink/70 mb-1">Department</label>
                <input
                  type="text"
                  placeholder="e.g. CRD, ISD, Finance"
                  value={newUserDept}
                  onChange={(e) => setNewUserDept(e.target.value)}
                  className="w-full text-xs p-2 border border-prime-rule bg-white focus:outline-none focus:border-prime-blue"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-prime-ink/70 mb-1">Role</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                  className="w-full text-xs p-2 border border-prime-rule bg-white focus:outline-none focus:border-prime-blue cursor-pointer"
                >
                  <option value="requestor">Requestor / Staff</option>
                  <option value="approver">Approver / TL</option>
                  <option value="finance">Finance & Accounting</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  className="prime-button w-full h-[35px] text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Member
                </button>
              </div>
            </form>
          </div>
        </section>
        </div>}
      </div>
    </div>
  );
}
