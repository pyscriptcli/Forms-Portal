import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_TOKEN,
  normalizeFormDestinations,
  getDefaultFormDestinations,
  DEFAULT_WORKFLOW_STATUSES,
  normalizeWorkflowStatuses,
  normalizeFieldMapping,
} from "@/lib/adminSettings";
import {
  isSupabaseAdminConfigured,
  readWorkflowStatusesFromSupabase,
  saveWorkflowStatusesToSupabase,
  readPortalSettingsFromSupabase,
  readFormDestinationsFromSupabase,
  savePortalSettingsToSupabase,
  saveFormDestinationsToSupabase,
} from "@/lib/supabaseAdmin";
import { invalidateRfpCache } from "@/lib/rfpCache";

async function readFlags() {
  return {
    rfpAutofillEnabled: true,
    demoModeEnabled: false,
    destinations: getDefaultFormDestinations(),
    workflowStatuses: DEFAULT_WORKFLOW_STATUSES,
    clickupFieldMapping: {},
    departments: ["COD", "MARKETING", "CRD", "LR", "ISD", "VisMin", "CPI", "BD", "HR", "R&A"],
  };
}

export async function GET() {
  const flags = await readFlags();
  if (isSupabaseAdminConfigured()) {
    try {
      const [workflowStatuses, portalSettings, destinations] = await Promise.all([
        readWorkflowStatusesFromSupabase(),
        readPortalSettingsFromSupabase(),
        readFormDestinationsFromSupabase(),
      ]);
      if (workflowStatuses) flags.workflowStatuses = workflowStatuses;
      if (destinations) flags.destinations = destinations;
      Object.assign(flags, portalSettings);
    } catch (error) {
      console.error("Failed to read workflow statuses from Supabase:", error);
    }
  }
  return NextResponse.json(flags);
}

export async function POST(req: NextRequest) {
  const token = req.headers.get("x-admin-token");
  if (token !== ADMIN_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const current = await readFlags();
  const hasWorkflowStatuses = Boolean(body.workflowStatuses && typeof body.workflowStatuses === "object");
  const hasDestinations = Boolean(body.destinations && typeof body.destinations === "object");
  if (hasWorkflowStatuses && isSupabaseAdminConfigured()) {
    await saveWorkflowStatusesToSupabase(normalizeWorkflowStatuses(body.workflowStatuses));
  }
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: "Supabase is required for shared Admin configuration." }, { status: 503 });
  }
  if (isSupabaseAdminConfigured()) {
    const portalSettings: Record<string, unknown> = {};
    if (typeof body.rfpAutofillEnabled === "boolean") portalSettings.rfpAutofillEnabled = body.rfpAutofillEnabled;
    if (typeof body.demoModeEnabled === "boolean") portalSettings.demoModeEnabled = body.demoModeEnabled;
    if (body.clickupFieldMapping && typeof body.clickupFieldMapping === "object") {
      portalSettings.clickupFieldMapping = normalizeFieldMapping(body.clickupFieldMapping);
    }
    if (Array.isArray(body.departments)) portalSettings.departments = body.departments.filter((v): v is string => typeof v === "string" && Boolean(v.trim())).map((v) => v.trim());
    await Promise.all([
      savePortalSettingsToSupabase(portalSettings),
      ...(hasDestinations
        ? [saveFormDestinationsToSupabase(normalizeFormDestinations(body.destinations))]
        : []),
    ]);
  }

  const updated = {
    ...current,
    ...(typeof body.rfpAutofillEnabled === "boolean"
      ? { rfpAutofillEnabled: body.rfpAutofillEnabled }
      : {}),
    ...(typeof body.demoModeEnabled === "boolean" ? { demoModeEnabled: body.demoModeEnabled } : {}),
    ...(body.destinations && typeof body.destinations === "object"
      ? { destinations: normalizeFormDestinations(body.destinations) }
      : {}),
    ...(body.workflowStatuses && typeof body.workflowStatuses === "object"
      ? { workflowStatuses: normalizeWorkflowStatuses(body.workflowStatuses) }
      : {}),
    ...(body.clickupFieldMapping && typeof body.clickupFieldMapping === "object"
      ? { clickupFieldMapping: normalizeFieldMapping(body.clickupFieldMapping) }
      : {}),
    ...(Array.isArray(body.departments) ? { departments: body.departments.filter((v): v is string => typeof v === "string" && Boolean(v.trim())).map((v) => v.trim()) } : {}),
  };

  invalidateRfpCache();

  // Vercel has a read-only deployment filesystem. Supabase is authoritative
  // for workflow statuses in production; JSON remains the local-dev fallback.
  return NextResponse.json({ success: true, flags: updated });
}
