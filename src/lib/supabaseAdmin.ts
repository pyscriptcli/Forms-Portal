import {
  DEFAULT_WORKFLOW_STATUSES,
  normalizeWorkflowStatuses,
  type WorkflowStatuses,
} from "@/lib/adminSettings";
import type { FormDestinationKey, FormDestination } from "@/lib/adminSettings";
import type { ClickUpFieldIdMapping } from "@/lib/clickupFields";
import type { UserAccessRecord } from "@/lib/rbac";

const WORKFLOW_TABLE = "forms-portal-workflow_statuses";
const DESTINATIONS_TABLE = "forms-portal-form_destinations";
const SETTINGS_TABLE = "forms-portal-settings";
const RBAC_TABLE = "forms-portal-RBAC";

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

export async function readWorkflowStatusesFromSupabase(): Promise<WorkflowStatuses | null> {
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
    if (row.workflow_key && row.clickup_status) result[row.workflow_key] = row.clickup_status;
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
  return Object.fromEntries(rows.map((row) => [row.form_type, {
    listId: row.clickup_list_id || "",
    workspaceId: row.clickup_workspace_id || "",
    label: row.display_name || row.form_type,
    enabled: row.enabled !== false,
  }])) as Record<FormDestinationKey, FormDestination>;
}

export async function readPortalSettingsFromSupabase(): Promise<{
  rfpAutofillEnabled?: boolean;
  clickupFieldMapping?: ClickUpFieldIdMapping;
  clickupWebhookId?: string;
  clickupWebhookEndpoint?: string;
  clickupWebhookSecret?: string;
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
    clickupFieldMapping:
      values.clickupFieldMapping && typeof values.clickupFieldMapping === "object"
        ? values.clickupFieldMapping as ClickUpFieldIdMapping
        : undefined,
    clickupWebhookId: typeof values.clickupWebhookId === "string" ? values.clickupWebhookId : undefined,
    clickupWebhookEndpoint: typeof values.clickupWebhookEndpoint === "string" ? values.clickupWebhookEndpoint : undefined,
    clickupWebhookSecret: typeof values.clickupWebhookSecret === "string" ? values.clickupWebhookSecret : undefined,
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
  for (const row of rows) {
    const updateResponse = await fetch(
      `${url}/rest/v1/${encodeURIComponent(DESTINATIONS_TABLE)}?form_type=eq.${encodeURIComponent(row.form_type)}`,
      {
        method: "PATCH",
        headers: supabaseHeaders(key, { Prefer: "return=minimal" }),
        body: JSON.stringify({
          display_name: row.display_name,
          clickup_workspace_id: row.clickup_workspace_id,
          clickup_list_id: row.clickup_list_id,
          enabled: row.enabled,
          updated_at: new Date().toISOString(),
        }),
      },
    );
    if (!updateResponse.ok) {
      throw new Error(`Supabase form destination save failed for ${row.form_type} (${updateResponse.status}): ${await updateResponse.text()}`);
    }
  }
}

export async function readRbacUsersFromSupabase(): Promise<UserAccessRecord[]> {
  const { url, key, isConfigured } = getSupabaseConfig();
  if (!isConfigured) throw new Error("Supabase is required for RBAC configuration.");
  const response = await fetch(`${url}/rest/v1/${encodeURIComponent(RBAC_TABLE)}?select=user_id,name,email,department,role,status,updated_at,clickup_task_id&order=name.asc`, {
    headers: supabaseHeaders(key), cache: "no-store",
  });
  if (!response.ok) throw new Error(`Supabase RBAC read failed (${response.status}): ${await response.text()}`);
  const rows = await response.json() as Array<Record<string, unknown>>;
  return rows.map((row) => ({
    id: String(row.user_id || ""), name: String(row.name || ""), email: String(row.email || ""),
    department: String(row.department || ""), role: row.role as UserAccessRecord["role"],
    status: row.status as UserAccessRecord["status"], updatedAt: row.updated_at ? String(row.updated_at) : undefined,
    clickUpTaskId: row.clickup_task_id ? String(row.clickup_task_id) : undefined,
  }));
}

export async function saveRbacUsersToSupabase(users: UserAccessRecord[]): Promise<void> {
  const { url, key, isConfigured } = getSupabaseConfig();
  if (!isConfigured) throw new Error("Supabase is required for RBAC configuration.");
  const rows = users.map((user) => ({
    user_id: user.id, name: user.name, email: user.email, department: user.department,
    role: user.role, status: user.status, updated_at: new Date().toISOString(),
    clickup_task_id: user.clickUpTaskId || null,
  }));
  const response = await fetch(`${url}/rest/v1/${encodeURIComponent(RBAC_TABLE)}?on_conflict=user_id`, {
    method: "POST", headers: supabaseHeaders(key, { Prefer: "resolution=merge-duplicates,return=minimal" }),
    body: JSON.stringify(rows),
  });
  if (!response.ok) throw new Error(`Supabase RBAC save failed (${response.status}): ${await response.text()}`);
}
