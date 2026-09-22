import {
  DEFAULT_WORKFLOW_STATUSES,
  DEFAULT_WORKFLOW_CONFIGURATIONS,
  normalizeWorkflowStatuses,
  normalizeWorkflowConfigurations,
  type WorkflowConfigurations,
  type WorkflowFormKey,
  type WorkflowStatuses,
} from "@/lib/adminSettings";
import { normalizeFormDestinations, type FormDestinationKey, type FormDestination } from "@/lib/adminSettings";
import type { ClickUpFieldIdMapping } from "@/lib/clickupFields";
import type { UserAccessRecord } from "@/lib/rbac";

const WORKFLOW_TABLE = "forms-portal-workflow_statuses";
const DESTINATIONS_TABLE = "forms-portal-form_destinations";
const SETTINGS_TABLE = "forms-portal-settings";
const RBAC_TABLE = "forms-portal-RBAC";
const DROPDOWN_TABLE = "portal_dropdown_options";

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  return { url: url.replace(/\/$/, ""), key, isConfigured: Boolean(url && key) };
}

function supabaseHeaders(key: string, extra: Record<string, string> = {}) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

export function isSupabaseAdminConfigured(): boolean {
  return getSupabaseConfig().isConfigured;
}

export type DepartmentAssignment = { department: string; tlName: string; tlEmail: string };
export type DropdownOptions = { department: DepartmentAssignment[]; tl_name: Array<{ name: string; email: string }> };

export async function readDropdownOptionsFromSupabase(): Promise<DropdownOptions | null> {
  const { url, key, isConfigured } = getSupabaseConfig();
  if (!isConfigured) return null;
  const response = await fetch(`${url}/rest/v1/${encodeURIComponent(DROPDOWN_TABLE)}?select=dropdown_key,option_value,department,tl_name,tl_email&is_active=eq.true&order=display_order.asc,option_value.asc`, { headers: supabaseHeaders(key), cache: "no-store" });
  if (!response.ok) throw new Error(`Supabase dropdown read failed (${response.status})`);
  const rows = await response.json() as Array<{ dropdown_key: string; option_value: string; department?: string | null; tl_name?: string | null; tl_email?: string | null }>;
  return {
    department: rows.filter((row) => row.dropdown_key === "tl_name" && (row.department || row.option_value)).map((row) => ({ department: row.department || "", tlName: row.tl_name || row.option_value, tlEmail: row.tl_email || "" })),
    tl_name: rows.filter((row) => row.dropdown_key === "tl_name").map((row) => ({ name: row.option_value, email: row.tl_email || "" })),
  };
}

export async function saveDropdownOptionsToSupabase(options: DropdownOptions): Promise<void> {
  const { url, key, isConfigured } = getSupabaseConfig();
  if (!isConfigured) throw new Error("Supabase is not configured on this deployment.");
  const clean = (values: string[]) => [...new Set(values.map((value) => value.trim()).filter(Boolean))];
  const response = await fetch(`${url}/rest/v1/${encodeURIComponent(DROPDOWN_TABLE)}?dropdown_key=in.(department,tl_name)`, { method: "DELETE", headers: supabaseHeaders(key, { Prefer: "return=minimal" }) });
  if (!response.ok) throw new Error(`Supabase dropdown reset failed (${response.status})`);
  const rows = options.department.map((assignment, display_order) => ({ dropdown_key: "tl_name", option_value: assignment.tlName.trim(), department: assignment.department.trim(), tl_name: assignment.tlName.trim(), tl_email: assignment.tlEmail.trim(), display_order, is_active: true }));
  if (!rows.length) rows.push(...options.tl_name.map((option, display_order) => ({ dropdown_key: "tl_name", option_value: option.name.trim(), department: "", tl_name: option.name.trim(), display_order, is_active: true, tl_email: option.email.trim() })));
  if (!rows.length) return;
  const insert = await fetch(`${url}/rest/v1/${encodeURIComponent(DROPDOWN_TABLE)}`, { method: "POST", headers: supabaseHeaders(key, { Prefer: "return=minimal" }), body: JSON.stringify(rows) });
  if (!insert.ok) throw new Error(`Supabase dropdown save failed (${insert.status})`);
}

export async function readWorkflowStatusesFromSupabase(form?: WorkflowFormKey): Promise<WorkflowStatuses | null> {
  const { url, key, isConfigured } = getSupabaseConfig();
  if (!isConfigured) return null;

  const response = await fetch(
    `${url}/rest/v1/${encodeURIComponent(WORKFLOW_TABLE)}?select=workflow_key,clickup_status`,
    { headers: supabaseHeaders(key), cache: "no-store" }
  );
  if (!response.ok) {
    throw new Error(`Supabase workflow status read failed (${response.status}): ${await response.text()}`);
  }

  const rows = await response.json() as Array<{ workflow_key?: string; clickup_status?: string }>;
  const values = rows.reduce<Record<string, string>>((result, row) => {
    if (!row.workflow_key || !row.clickup_status) return result;
    const prefix = form ? `${form}.` : "";
    if (form && row.workflow_key.startsWith(prefix)) result[row.workflow_key.slice(prefix.length)] = row.clickup_status;
    else if (!form && !row.workflow_key.includes(".")) result[row.workflow_key] = row.clickup_status;
    return result;
  }, {});
  return rows.length > 0 ? normalizeWorkflowStatuses(values) : DEFAULT_WORKFLOW_STATUSES;
}

export async function saveWorkflowStatusesToSupabase(statuses: WorkflowStatuses): Promise<void> {
  const { url, key, isConfigured } = getSupabaseConfig();
  if (!isConfigured) throw new Error("Supabase is not configured on this deployment.");

  const normalized = normalizeWorkflowStatuses(statuses);
  const rows = Object.entries(normalized).map(([workflow_key, clickup_status]) => ({
    workflow_key,
    display_name: workflow_key,
    clickup_status,
  }));
  const response = await fetch(`${url}/rest/v1/${encodeURIComponent(WORKFLOW_TABLE)}`, {
    method: "POST",
    headers: supabaseHeaders(key, { Prefer: "resolution=merge-duplicates,return=minimal" }),
    body: JSON.stringify(rows),
  });
  if (!response.ok) {
    throw new Error(`Supabase workflow status save failed (${response.status}): ${await response.text()}`);
  }
}

export async function readWorkflowConfigurationsFromSupabase(): Promise<WorkflowConfigurations | null> {
  const { url, key, isConfigured } = getSupabaseConfig();
  if (!isConfigured) return null;
  const response = await fetch(`${url}/rest/v1/${encodeURIComponent(WORKFLOW_TABLE)}?select=workflow_key,clickup_status`, { headers: supabaseHeaders(key), cache: "no-store" });
  if (!response.ok) throw new Error(`Supabase workflow configuration read failed (${response.status}): ${await response.text()}`);
  const rows = await response.json() as Array<{ workflow_key?: string; clickup_status?: string }>;
  const grouped: Record<string, Record<string, string>> = {};
  const legacy: Record<string, string> = {};
  for (const row of rows) {
    if (!row.workflow_key || !row.clickup_status) continue;
    const separator = row.workflow_key.indexOf(".");
    if (separator > 0) {
      const form = row.workflow_key.slice(0, separator);
      grouped[form] ||= {};
      grouped[form][row.workflow_key.slice(separator + 1)] = row.clickup_status;
    } else legacy[row.workflow_key] = row.clickup_status;
  }
  return normalizeWorkflowConfigurations({
    rfp: grouped.rfp ? grouped.rfp : legacy,
    rfb: grouped.rfb || DEFAULT_WORKFLOW_CONFIGURATIONS.rfb,
    "travel-budget": grouped["travel-budget"] || DEFAULT_WORKFLOW_CONFIGURATIONS["travel-budget"],
  });
}

export async function saveWorkflowConfigurationsToSupabase(configurations: WorkflowConfigurations): Promise<void> {
  const { url, key, isConfigured } = getSupabaseConfig();
  if (!isConfigured) throw new Error("Supabase is not configured on this deployment.");
  const normalized = normalizeWorkflowConfigurations(configurations);
  const rows = (Object.entries(normalized) as Array<[WorkflowFormKey, WorkflowStatuses]>).flatMap(([form, statuses]) =>
    Object.entries(statuses).map(([workflowKey, clickup_status]) => ({ workflow_key: `${form}.${workflowKey}`, display_name: `${form} ${workflowKey}`, clickup_status }))
  );
  rows.push(...Object.entries(normalized.rfp).map(([workflow_key, clickup_status]) => ({ workflow_key, display_name: workflow_key, clickup_status })));
  const response = await fetch(`${url}/rest/v1/${encodeURIComponent(WORKFLOW_TABLE)}`, {
    method: "POST",
    headers: supabaseHeaders(key, { Prefer: "resolution=merge-duplicates,return=minimal" }),
    body: JSON.stringify(rows),
  });
  if (!response.ok) throw new Error(`Supabase workflow configuration save failed (${response.status}): ${await response.text()}`);
}

export async function readFormDestinationFromSupabase(
  formType: FormDestinationKey
): Promise<FormDestination | null> {
  const { url, key, isConfigured } = getSupabaseConfig();
  if (!isConfigured) return null;

  const response = await fetch(
    `${url}/rest/v1/${encodeURIComponent(DESTINATIONS_TABLE)}?form_type=eq.${encodeURIComponent(formType)}&select=clickup_list_id,clickup_workspace_id,display_name,enabled`,
    { headers: supabaseHeaders(key), cache: "no-store" }
  );
  if (!response.ok) {
    throw new Error(`Supabase form destination read failed (${response.status}): ${await response.text()}`);
  }

  const rows = await response.json() as Array<{
    clickup_list_id?: string;
    clickup_workspace_id?: string;
    display_name?: string;
    enabled?: boolean;
  }>;
  const row = rows[0];
  if (!row) return null;
  return {
    listId: row.clickup_list_id || "",
    workspaceId: row.clickup_workspace_id || "",
    label: row.display_name || formType,
    enabled: row.enabled !== false,
  };
}

export async function readFormDestinationsFromSupabase(): Promise<Record<FormDestinationKey, FormDestination>> {
  const { url, key, isConfigured } = getSupabaseConfig();
  if (!isConfigured) throw new Error("Supabase is required for shared form destination configuration.");
  const response = await fetch(
    `${url}/rest/v1/${encodeURIComponent(DESTINATIONS_TABLE)}?select=form_type,clickup_list_id,clickup_workspace_id,display_name,enabled&order=form_type.asc`,
    { headers: supabaseHeaders(key), cache: "no-store" },
  );
  if (!response.ok) throw new Error(`Supabase form destinations read failed (${response.status}): ${await response.text()}`);
  const rows = await response.json() as Array<{
    form_type: FormDestinationKey;
    clickup_list_id?: string;
    clickup_workspace_id?: string;
    display_name?: string;
    enabled?: boolean;
  }>;
  return normalizeFormDestinations(Object.fromEntries(rows.map((row) => [row.form_type, {
    listId: row.clickup_list_id || "",
    workspaceId: row.clickup_workspace_id || "",
    label: row.display_name || row.form_type,
    enabled: row.enabled !== false,
  }])));
}

export async function readPortalSettingsFromSupabase(): Promise<{
  rfpAutofillEnabled?: boolean;
  demoModeEnabled?: boolean;
  clickupFieldMapping?: ClickUpFieldIdMapping;
  clickupWebhookId?: string;
  clickupWebhookEndpoint?: string;
  clickupWebhookSecret?: string;
  departments?: string[];
}> {
  const { url, key, isConfigured } = getSupabaseConfig();
  if (!isConfigured) return {};
  const response = await fetch(
    `${url}/rest/v1/${encodeURIComponent(SETTINGS_TABLE)}?select=setting_key,setting_value`,
    { headers: supabaseHeaders(key), cache: "no-store" },
  );
  if (!response.ok) return {};
  const rows = await response.json() as Array<{ setting_key: string; setting_value: unknown }>;
  const values = Object.fromEntries(rows.map((row) => [row.setting_key, row.setting_value]));
  return {
    rfpAutofillEnabled: typeof values.rfpAutofillEnabled === "boolean" ? values.rfpAutofillEnabled : undefined,
    demoModeEnabled: typeof values.demoModeEnabled === "boolean" ? values.demoModeEnabled : undefined,
    clickupFieldMapping:
      values.clickupFieldMapping && typeof values.clickupFieldMapping === "object"
        ? values.clickupFieldMapping as ClickUpFieldIdMapping
        : undefined,
    clickupWebhookId: typeof values.clickupWebhookId === "string" ? values.clickupWebhookId : undefined,
    clickupWebhookEndpoint: typeof values.clickupWebhookEndpoint === "string" ? values.clickupWebhookEndpoint : undefined,
    clickupWebhookSecret: typeof values.clickupWebhookSecret === "string" ? values.clickupWebhookSecret : undefined,
    departments: Array.isArray(values.departments) ? values.departments.filter((v): v is string => typeof v === "string") : undefined,
  };
}

export async function savePortalSettingsToSupabase(values: Record<string, unknown>): Promise<void> {
  const { url, key, isConfigured } = getSupabaseConfig();
  if (!isConfigured) throw new Error("Supabase is not configured on this deployment.");
  const rows = Object.entries(values).map(([setting_key, setting_value]) => ({ setting_key, setting_value }));
  if (rows.length === 0) return;
  const response = await fetch(`${url}/rest/v1/${encodeURIComponent(SETTINGS_TABLE)}`, {
    method: "POST",
    headers: supabaseHeaders(key, { Prefer: "resolution=merge-duplicates,return=minimal" }),
    body: JSON.stringify(rows),
  });
  if (!response.ok) throw new Error(`Supabase portal settings save failed (${response.status}): ${await response.text()}`);
}

export async function saveFormDestinationsToSupabase(destinations: Record<FormDestinationKey, FormDestination>): Promise<void> {
  const { url, key, isConfigured } = getSupabaseConfig();
  if (!isConfigured) throw new Error("Supabase is not configured on this deployment.");
  const rows = Object.entries(destinations).map(([form_type, destination]) => ({
    form_type,
    display_name: destination.label,
    clickup_workspace_id: destination.workspaceId,
    clickup_list_id: destination.listId,
    enabled: destination.enabled,
  }));
  const response = await fetch(
    `${url}/rest/v1/${encodeURIComponent(DESTINATIONS_TABLE)}?on_conflict=form_type`,
    {
      method: "POST",
      headers: supabaseHeaders(key, { Prefer: "resolution=merge-duplicates,return=minimal" }),
      body: JSON.stringify(rows),
    },
  );
  if (!response.ok) {
    throw new Error(`Supabase form destinations save failed (${response.status}): ${await response.text()}`);
  }
}

export async function readRbacUsersFromSupabase(): Promise<UserAccessRecord[]> {
  const { url, key, isConfigured } = getSupabaseConfig();
  if (!isConfigured) throw new Error("Supabase is required for RBAC configuration.");
  const response = await fetch(`${url}/rest/v1/${encodeURIComponent(RBAC_TABLE)}?select=user_id,name,email,department,role,status,updated_at,clickup_task_id,permissions&order=name.asc`, {
    headers: supabaseHeaders(key), cache: "no-store",
  });
  if (!response.ok) throw new Error(`Supabase RBAC read failed (${response.status}): ${await response.text()}`);
  const rows = await response.json() as Array<Record<string, unknown>>;
  return rows.map((row) => ({
    id: String(row.user_id || ""), name: String(row.name || ""), email: String(row.email || ""),
    department: String(row.department || ""), role: row.role as UserAccessRecord["role"],
    status: row.status as UserAccessRecord["status"], updatedAt: row.updated_at ? String(row.updated_at) : undefined,
    clickUpTaskId: row.clickup_task_id ? String(row.clickup_task_id) : undefined,
    permissions: Array.isArray(row.permissions) ? row.permissions as UserAccessRecord["permissions"] : undefined,
  }));
}

export async function saveRbacUsersToSupabase(users: UserAccessRecord[]): Promise<void> {
  const { url, key, isConfigured } = getSupabaseConfig();
  if (!isConfigured) throw new Error("Supabase is required for RBAC configuration.");
  const rows = users.map((user) => ({
    user_id: user.id, name: user.name, email: user.email, department: user.department,
    role: user.role, status: user.status, updated_at: new Date().toISOString(),
    clickup_task_id: user.clickUpTaskId || null,
    permissions: user.permissions || null,
  }));
  const response = await fetch(`${url}/rest/v1/${encodeURIComponent(RBAC_TABLE)}?on_conflict=user_id`, {
    method: "POST", headers: supabaseHeaders(key, { Prefer: "resolution=merge-duplicates,return=minimal" }),
    body: JSON.stringify(rows),
  });
  if (!response.ok) throw new Error(`Supabase RBAC save failed (${response.status}): ${await response.text()}`);
}
