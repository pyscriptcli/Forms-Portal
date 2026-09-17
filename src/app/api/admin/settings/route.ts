import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
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
  savePortalSettingsToSupabase,
  saveFormDestinationsToSupabase,
} from "@/lib/supabaseAdmin";

const FLAGS_PATH = path.join(process.cwd(), "src", "lib", "featureFlags.json");

async function readFlags() {
  try {
    const raw = await fs.readFile(FLAGS_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return {
      ...parsed,
      clickupFieldMapping: normalizeFieldMapping(parsed.clickupFieldMapping),
    };
  } catch {
    return {
      rfpAutofillEnabled: true,
      destinations: getDefaultFormDestinations(),
      workflowStatuses: DEFAULT_WORKFLOW_STATUSES,
      clickupFieldMapping: {},
    };
  }
}

async function writeFlags(flags: object) {
  await fs.writeFile(FLAGS_PATH, JSON.stringify(flags, null, 2), "utf8");
}

export async function GET() {
  const flags = await readFlags();
  if (isSupabaseAdminConfigured()) {
    try {
      const [workflowStatuses, portalSettings] = await Promise.all([
        readWorkflowStatusesFromSupabase(),
        readPortalSettingsFromSupabase(),
      ]);
      if (workflowStatuses) flags.workflowStatuses = workflowStatuses;
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
  if (isSupabaseAdminConfigured()) {
    const portalSettings: Record<string, unknown> = {};
    if (typeof body.rfpAutofillEnabled === "boolean") portalSettings.rfpAutofillEnabled = body.rfpAutofillEnabled;
    if (body.clickupFieldMapping && typeof body.clickupFieldMapping === "object") {
      portalSettings.clickupFieldMapping = normalizeFieldMapping(body.clickupFieldMapping);
    }
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
    ...(body.destinations && typeof body.destinations === "object"
      ? { destinations: normalizeFormDestinations(body.destinations) }
      : {}),
    ...(body.workflowStatuses && typeof body.workflowStatuses === "object"
      ? { workflowStatuses: normalizeWorkflowStatuses(body.workflowStatuses) }
      : {}),
    ...(body.clickupFieldMapping && typeof body.clickupFieldMapping === "object"
      ? { clickupFieldMapping: normalizeFieldMapping(body.clickupFieldMapping) }
      : {}),
  };

  // Vercel has a read-only deployment filesystem. Supabase is authoritative
  // for workflow statuses in production; JSON remains the local-dev fallback.
  if (!isSupabaseAdminConfigured()) {
    await writeFlags(updated);
  }
  return NextResponse.json({ success: true, flags: updated });
}
