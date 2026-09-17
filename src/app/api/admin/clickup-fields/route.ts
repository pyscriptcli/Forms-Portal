import { NextRequest, NextResponse } from "next/server";
import {
  getClickUpConfig,
  getListCustomFields,
  createClickUpWebhook,
} from "@/lib/clickup";
import {
  resolveFieldIdMapping,
  validateFieldMapping,
} from "@/lib/clickupFields";
import { ADMIN_TOKEN } from "@/lib/adminSettings";
import {
  isSupabaseAdminConfigured,
  readFormDestinationFromSupabase,
  readPortalSettingsFromSupabase,
  readWorkflowStatusesFromSupabase,
  savePortalSettingsToSupabase,
} from "@/lib/supabaseAdmin";

export async function GET(req: NextRequest) {
  try {
    const destination = isSupabaseAdminConfigured()
      ? await readFormDestinationFromSupabase("rfp")
      : null;
    const { token, listId, isConfigured } = getClickUpConfig("rfp", undefined, destination?.listId);
    if (!isConfigured) {
      return NextResponse.json(
        { success: false, message: "ClickUp token or RFP list ID not configured in environment." },
        { status: 400 }
      );
    }

    const availableFields = await getListCustomFields(listId, token);
    const discoveredMapping = resolveFieldIdMapping(availableFields);
    const sharedSettings = isSupabaseAdminConfigured() ? await readPortalSettingsFromSupabase() : {};
    const mapping = { ...(sharedSettings.clickupFieldMapping || {}), ...discoveredMapping };
    const validation = validateFieldMapping(mapping);

    return NextResponse.json({
      success: true,
      listId,
      totalAvailable: availableFields.length,
      availableFields: availableFields.map((f) => ({ id: f.id, name: f.name, type: f.type })),
      mapping,
      validation,
      isConfigured: validation.isComplete,
      webhookId: sharedSettings.clickupWebhookId || null,
      webhookEndpoint: sharedSettings.clickupWebhookEndpoint || null,
    });
  } catch (err: any) {
    console.error("Error checking ClickUp custom fields contract:", err);
    return NextResponse.json(
      { success: false, message: err.message || "Failed to inspect ClickUp custom fields." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminTokenHeader = req.headers.get("x-admin-token");
    if (adminTokenHeader !== ADMIN_TOKEN) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action || "discover_and_save";

    const destination = isSupabaseAdminConfigured()
      ? await readFormDestinationFromSupabase("rfp")
      : null;
    const { token, listId, isConfigured } = getClickUpConfig("rfp", undefined, destination?.listId);

    if (!isConfigured) {
      return NextResponse.json(
        { success: false, message: "ClickUp API token or RFP List ID is not configured. Webhook registration requires a personal ClickUp API token from the same workspace; an OAuth token may return OAUTH_027." },
        { status: 400 }
      );
    }

    if (action === "create_webhook") {
      const host = req.headers.get("host") || "localhost:3000";
      const protocol = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
      const appUrl = (process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`).replace(/\/+$/, "");
      const webhookEndpoint = `${appUrl}/api/clickup/webhook`;

      let workspaceId: string | undefined;
      const configuredWorkspaceId = destination?.workspaceId?.trim();
      workspaceId = configuredWorkspaceId;
      const webhookResult = await createClickUpWebhook(listId, webhookEndpoint, token, workspaceId);
      if (isSupabaseAdminConfigured()) {
        await savePortalSettingsToSupabase({
          clickupWebhookId: webhookResult.id || null,
          clickupWebhookEndpoint: webhookEndpoint,
          clickupWebhookSecret: webhookResult.secret || null,
        });
      }

      return NextResponse.json({
        success: true,
        message: "ClickUp webhook registered successfully for taskStatusUpdated.",
        endpoint: webhookEndpoint,
        webhookId: webhookResult.id,
        secret: webhookResult.secret,
      });
    }

    // Default: discover fields and save to settings
    const availableFields = await getListCustomFields(listId, token);
    const discoveredMapping = resolveFieldIdMapping(availableFields);
    const sharedSettings = isSupabaseAdminConfigured() ? await readPortalSettingsFromSupabase() : {};
    const mapping = { ...(sharedSettings.clickupFieldMapping || {}), ...discoveredMapping };
    const validation = validateFieldMapping(mapping);

    if (isSupabaseAdminConfigured()) {
      await savePortalSettingsToSupabase({ clickupFieldMapping: mapping });
    }

    return NextResponse.json({
      success: true,
      message: `Discovered and saved ${validation.mappedCount} of ${validation.totalExpected} contract fields.`,
      mapping,
      validation,
    });
    } catch (err: any) {
      console.error("Error in POST /api/admin/clickup-fields:", err);
      const message = String(err?.message || "");
      if (message.includes("OAUTH_027") || message.includes("Team not authorized")) {
        return NextResponse.json({
          success: false,
          message: "ClickUp rejected webhook administration for this credential (OAUTH_027). Set CLICKUP_API_TOKEN to a personal API token created by an admin in the same ClickUp workspace, then redeploy.",
        }, { status: 401 });
      }
      return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
