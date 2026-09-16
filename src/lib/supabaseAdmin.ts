import {
  DEFAULT_WORKFLOW_STATUSES,
  normalizeWorkflowStatuses,
  type WorkflowStatuses,
} from "@/lib/adminSettings";
import type { FormDestinationKey, FormDestination } from "@/lib/adminSettings";
import { formatRfpReference } from "@/lib/rfpNaming";

const WORKFLOW_TABLE = "forms-portal-workflow_statuses";
const DESTINATIONS_TABLE = "forms-portal-form_destinations";
const SEQUENCE_RPC = "forms_portal_allocate_rfp_sequence";

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

export async function readNextRfpReference(referenceMonth: string): Promise<{ reference: string; lastSequence: number }> {
  const { url, key, isConfigured } = getSupabaseConfig();
  if (!isConfigured) throw new Error("Finance numbering is unavailable until Supabase is configured.");

  const response = await fetch(
    `${url}/rest/v1/${encodeURIComponent("forms-portal-rfp_sequence")}?select=sequence_number&order=sequence_number.desc&limit=1`,
    { headers: supabaseHeaders(key), cache: "no-store", signal: AbortSignal.timeout(4000) }
  );
  if (!response.ok) {
    throw new Error(`Finance number lookup failed (${response.status}): ${await response.text()}`);
  }
  const rows = await response.json() as Array<{ sequence_number?: number }>;
  const lastSequence = Number(rows[0]?.sequence_number || 0);
  const nextSequence = lastSequence + 1;
  if (nextSequence > 9999) throw new Error("Finance RFP sequence limit reached at 9999.");
  return { reference: formatRfpReference(referenceMonth, nextSequence), lastSequence };
}

export async function allocateRfpReference(input: {
  referenceMonth: string;
  entityCode: string;
  payeeToken: string;
}): Promise<string> {
  const { url, key, isConfigured } = getSupabaseConfig();
  if (!isConfigured) throw new Error("Finance numbering is unavailable until Supabase is configured.");
  const response = await fetch(`${url}/rest/v1/rpc/${SEQUENCE_RPC}`, {
    method: "POST",
    headers: supabaseHeaders(key),
    body: JSON.stringify({
      p_reference_month: input.referenceMonth,
      p_entity_code: input.entityCode,
      p_payee_token: input.payeeToken,
    }),
    cache: "no-store",
  });
  if (response.ok) {
    const rows = await response.json() as Array<{ base_reference?: string }>;
    const reference = rows[0]?.base_reference;
    if (!reference) throw new Error("Finance number allocation returned no reference.");
    return reference;
  }

  // Older deployments may have the table but not yet have refreshed the RPC
  // schema cache. Use the unique sequence_number constraint as a retry-safe
  // compatibility path while the migration is being applied.
  const rpcError = await response.text();
  const canUseCompatibilityPath =
    (response.status === 404 && rpcError.includes("PGRST202")) ||
    (response.status === 400 && rpcError.includes("42804"));
  if (!canUseCompatibilityPath) {
    throw new Error(`Finance number allocation failed (${response.status}): ${rpcError}`);
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const latestResponse = await fetch(
      `${url}/rest/v1/${encodeURIComponent("forms-portal-rfp_sequence")}?select=sequence_number&order=sequence_number.desc&limit=1`,
      { headers: supabaseHeaders(key), cache: "no-store" }
    );
    if (!latestResponse.ok) {
      throw new Error("Finance numbering is not installed in Supabase. Run sql/rfp_sequence_migration.sql, then retry.");
    }
    const latestRows = await latestResponse.json() as Array<{ sequence_number?: number }>;
    const nextNumber = Number(latestRows[0]?.sequence_number || 0) + 1;
    if (nextNumber > 9999) throw new Error("Finance RFP sequence limit reached at 9999.");
    const baseReference = `RFP-${input.referenceMonth}-${String(nextNumber).padStart(4, "0")}`;
    const insertResponse = await fetch(`${url}/rest/v1/${encodeURIComponent("forms-portal-rfp_sequence")}`, {
      method: "POST",
      headers: supabaseHeaders(key, { Prefer: "return=representation" }),
      body: JSON.stringify({
        reference_month: input.referenceMonth,
        sequence_number: nextNumber,
        base_reference: baseReference,
        submission_path: "option-a",
        entity_code: input.entityCode,
        payee_token: input.payeeToken,
      }),
    });
    if (insertResponse.ok) return baseReference;
    if (insertResponse.status !== 409) {
      throw new Error(`Finance number allocation failed (${insertResponse.status}): ${await insertResponse.text()}`);
    }
  }
  throw new Error("Finance number allocation is busy. Retry the submission.");
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
