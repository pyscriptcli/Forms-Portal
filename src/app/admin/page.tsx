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
} from "lucide-react";
import {
  validateAdminCredentials,
  isAdminAuthenticated,
  setAdminSession,
  clearAdminSession,
  saveAdminSettings,
  getAdminSettings,
  ADMIN_TOKEN,
  type AdminSettings,
  type FormDestinationKey,
  type FormDestinations,
} from "@/lib/adminSettings";
import {
  ROLE_DEFINITIONS,
  DEFAULT_USERS,
  getLocalRbacUsers,
  saveLocalRbacUsers,
  type UserAccessRecord,
  type UserRole,
} from "@/lib/rbac";

const DEFAULT_FORM_DESTINATIONS: FormDestinations = {
  rfp: { listId: "901420772915", workspaceId: "9014981136", label: "PRIME RFP submissions", enabled: true },
  "gw-rfp": { listId: "901420772915", workspaceId: "9014981136", label: "GW RFP submissions", enabled: true },
  "travel-budget": { listId: "901420772915", workspaceId: "9014981136", label: "Travel Budget requests", enabled: true },
  po: { listId: "", workspaceId: "9014981136", label: "Purchase Order requests", enabled: true },
  pcv: { listId: "", workspaceId: "9014981136", label: "Petty Cash Voucher requests", enabled: true },
};

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<"features" | "destinations" | "rbac">("features");
  const [authed, setAuthed] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [settings, setSettings] = useState<AdminSettings>({
    portalGuideEnabled: true,
    rfpAutofillEnabled: true,
    destinations: DEFAULT_FORM_DESTINATIONS,
  });
  const [destinations, setDestinations] = useState<FormDestinations>(DEFAULT_FORM_DESTINATIONS);
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
        saveLocalRbacUsers(data.users);
      } else {
        setUsers(getLocalRbacUsers());
      }
    } catch {
      setUsers(getLocalRbacUsers());
    } finally {
      setIsRefreshingRbac(false);
    }
  };

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
          }
        })
        .catch(() => {
          const localSettings = getAdminSettings();
          setSettings(localSettings);
          if (localSettings.destinations) setDestinations(localSettings.destinations);
        });

      // Load RBAC users from the server-side RBAC database
      loadRbacData();
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

  async function handleToggle(key: "portalGuideEnabled" | "rfpAutofillEnabled") {
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
    saveAdminSettings(updated);
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
    saveLocalRbacUsers(users);

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
        saveLocalRbacUsers(data.users);
      }

      setRbacSaveMsg("Role assignments saved to the local RBAC database.");
    } catch (err: any) {
      setRbacSaveMsg("Saved to local storage fallback.");
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
  const toggles: { key: "portalGuideEnabled" | "rfpAutofillEnabled"; label: string; description: string }[] = [
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
                  ["po", "Purchase Order"],
                  ["pcv", "Petty Cash Voucher"],
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
                title="Refresh users from the local RBAC database"
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
