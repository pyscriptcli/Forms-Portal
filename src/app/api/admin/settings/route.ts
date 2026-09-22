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
  readDropdownOptionsFromSupabase,
  saveDropdownOptionsToSupabase,
} from "@/lib/supabaseAdmin";
import { invalidateRfpCache } from "@/lib/rfpCache";

async function readFlags() {
  return {
    rfpAutofillEnabled: true,
    demoModeEnabled: false,
    destinations: getDefaultFormDestinations(),
    workflowStatuses: DEFAULT_WORKFLOW_STATUSES,
    clickupFieldMapping: {},
    departments: [] as Array<{ department: string; tlName: string; tlEmail: string }>,
    tlOptions: [] as Array<{ name: string; email: string }>,
  };
}

export async function GET() {
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: "Supabase is required for shared Admin configuration." }, { status: 503 });
  }

  try {
    const flags = await readFlags();
    const [workflowStatuses, portalSettings, destinations, dropdowns] = await Promise.all([
      readWorkflowStatusesFromSupabase(),
      readPortalSettingsFromSupabase(),
      readFormDestinationsFromSupabase(),
      readDropdownOptionsFromSupabase(),
    ]);
    if (workflowStatuses) flags.workflowStatuses = workflowStatuses;
    if (destinations) flags.destinations = destinations;
    Object.assign(flags, portalSettings);
    flags.departments = dropdowns?.department ?? [];
    flags.tlOptions = dropdowns?.department.map((item) => ({ name: item.tlName, email: item.tlEmail })) ?? [];
    return NextResponse.json(flags, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    console.error("Failed to read Admin configuration from Supabase:", error);
    return NextResponse.json({ error: "Could not read Admin configuration from Supabase." }, { status: 500 });
  }
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
  const hasDropdowns = Array.isArray(body.departments) || Array.isArray(body.tlOptions);
  if (hasWorkflowStatuses && isSupabaseAdminConfigured()) {
    await saveWorkflowStatusesToSupabase(normalizeWorkflowStatuses(body.workflowStatuses));
  }
  if (!isSupabaseAdminConfigured()) {
    return NextResponse.json({ error: "Supabase is required for shared Admin configuration." }, { status: 503 });
  }
  if (hasDropdowns) {
    const existing = await readDropdownOptionsFromSupabase();
    await saveDropdownOptionsToSupabase({
      department: Array.isArray(body.departments) ? body.departments.filter((v): v is { department: string; tlName: string; tlEmail: string } => Boolean(v && typeof v === "object" && typeof (v as any).department === "string" && typeof (v as any).tlName === "string" && typeof (v as any).tlEmail === "string")) : existing?.department ?? [],
      tl_name: Array.isArray(body.tlOptions) ? body.tlOptions.filter((v): v is { name: string; email: string } => Boolean(v && typeof v === "object" && typeof (v as { name?: unknown }).name === "string" && typeof (v as { email?: unknown }).email === "string")) : existing?.tl_name ?? [],
    });
  }
  if (isSupabaseAdminConfigured()) {
    const portalSettings: Record<string, unknown> = {};
    let persistedDestinations;
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
    if (hasDestinations) {
      // Return what was actually persisted, not the request body. Supabase remains authoritative.
      persistedDestinations = await readFormDestinationsFromSupabase();
    }

    const updated = {
      ...current,
      ...(typeof body.rfpAutofillEnabled === "boolean" ? { rfpAutofillEnabled: body.rfpAutofillEnabled } : {}),
      ...(typeof body.demoModeEnabled === "boolean" ? { demoModeEnabled: body.demoModeEnabled } : {}),
      ...(persistedDestinations ? { destinations: persistedDestinations } : {}),
      ...(body.workflowStatuses && typeof body.workflowStatuses === "object"
        ? { workflowStatuses: normalizeWorkflowStatuses(body.workflowStatuses) }
        : {}),
      ...(body.clickupFieldMapping && typeof body.clickupFieldMapping === "object"
        ? { clickupFieldMapping: normalizeFieldMapping(body.clickupFieldMapping) }
        : {}),
      ...(Array.isArray(body.departments) ? { departments: body.departments } : {}),
      ...(Array.isArray(body.tlOptions) ? { tlOptions: body.tlOptions } : {}),
    };

    invalidateRfpCache();
    return NextResponse.json({ success: true, flags: updated }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  }
}
