import { NextRequest, NextResponse } from "next/server";
import { ADMIN_TOKEN, DEFAULT_WORKFLOW_CONFIGURATIONS, normalizeWorkflowConfigurations, type WorkflowFormKey } from "@/lib/adminSettings";
import { getClickUpConfig, getListCustomFields, getListStatuses } from "@/lib/clickup";
import { isSupabaseAdminConfigured, readFormDestinationFromSupabase, readWorkflowConfigurationsFromSupabase, saveWorkflowConfigurationsToSupabase } from "@/lib/supabaseAdmin";

const FORM_KEYS: WorkflowFormKey[] = ["rfp", "rfb", "travel-budget"];
function isFormKey(value: unknown): value is WorkflowFormKey { return FORM_KEYS.includes(value as WorkflowFormKey); }

export async function GET(req: NextRequest) {
  const formType = req.nextUrl.searchParams.get("formType") || "rfp";
  if (!isFormKey(formType)) return NextResponse.json({ error: "Unsupported workflow form." }, { status: 400 });
  if (!isSupabaseAdminConfigured()) return NextResponse.json({ error: "Supabase is required for workflow configuration." }, { status: 503 });
  try {
    const [destination, configurations] = await Promise.all([
      readFormDestinationFromSupabase(formType),
      readWorkflowConfigurationsFromSupabase(),
    ]);
    const config = getClickUpConfig(formType, undefined, destination?.listId);
    const [statuses, fields] = config.isConfigured
      ? await Promise.all([getListStatuses(config.listId, config.token), getListCustomFields(config.listId, config.token)])
      : [[], []];
    return NextResponse.json({
      formType,
      destination,
      workflow: configurations?.[formType] || DEFAULT_WORKFLOW_CONFIGURATIONS[formType],
      statuses,
      fields: fields.map((field) => ({ id: field.id, name: field.name, type: field.type })),
      configured: config.isConfigured,
    }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Could not discover ClickUp workflow metadata." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (req.headers.get("x-admin-token") !== ADMIN_TOKEN) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSupabaseAdminConfigured()) return NextResponse.json({ error: "Supabase is required for workflow configuration." }, { status: 503 });
  try {
    const body = await req.json();
    if (!isFormKey(body?.formType) || !body?.workflow || typeof body.workflow !== "object") return NextResponse.json({ error: "formType and workflow are required." }, { status: 400 });
    const formType = body.formType as WorkflowFormKey;
    const current = (await readWorkflowConfigurationsFromSupabase()) || DEFAULT_WORKFLOW_CONFIGURATIONS;
    const next = normalizeWorkflowConfigurations({ ...current, [formType]: body.workflow });
    await saveWorkflowConfigurationsToSupabase(next);
    const saved = await readWorkflowConfigurationsFromSupabase();
    return NextResponse.json({ success: true, workflow: saved?.[formType] || next[formType] }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Could not save workflow configuration." }, { status: 500 });
  }
}
