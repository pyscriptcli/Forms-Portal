import {
  DEFAULT_WORKFLOW_STATUSES,
  normalizeWorkflowStatuses,
  type WorkflowStatuses,
} from "@/lib/adminSettings";

const WORKFLOW_TABLE = "forms-portal-workflow_statuses";

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
