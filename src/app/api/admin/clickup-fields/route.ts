import { NextRequest, NextResponse } from "next/server";
import {
  getClickUpConfig,
  getListCustomFields,
  createClickUpWebhook,
  getListTasks,
  backfillMilestoneTimestampsToClickUp,
} from "@/lib/clickup";
import { resolveFieldIdMapping, validateFieldMapping } from "@/lib/clickupFields";
import { mapClickUpTaskToTrackedRfp } from "@/lib/rfpTrackerMapping";
import { ADMIN_TOKEN } from "@/lib/adminSettings";
import { promises as fs } from "fs";
import path from "path";
import {
  isSupabaseAdminConfigured,
  readFormDestinationFromSupabase,
  readPortalSettingsFromSupabase,
  savePortalSettingsToSupabase,
} from "@/lib/supabaseAdmin";

const FLAGS_PATH = path.join(process.cwd(), "src", "lib", "featureFlags.json");

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
      availableFields,
      mapping,
      validation,
    });
  } catch (err: any) {
    console.error("Error in GET /api/admin/clickup-fields:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const adminToken = req.headers.get("x-admin-token");
  if (adminToken !== ADMIN_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
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
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;
      const webhookEndpoint = `${appUrl}/api/clickup/webhook`;

      let workspaceId: string | undefined;
      try {
        const raw = await fs.readFile(FLAGS_PATH, "utf8");
        const flags = JSON.parse(raw);
        workspaceId = flags.destinations?.rfp?.workspaceId || flags.workspaceId;
      } catch {}
      const webhookResult = await createClickUpWebhook(listId, webhookEndpoint, token, workspaceId);
      if (isSupabaseAdminConfigured()) {
        await savePortalSettingsToSupabase({
          clickupWebhookId: webhookResult.id || null,
          clickupWebhookEndpoint: webhookEndpoint,
        });
      }

      // Persist webhook ID and secret
      try {
        const raw = await fs.readFile(FLAGS_PATH, "utf8");
        const flags = JSON.parse(raw);
        flags.clickupWebhookId = webhookResult.id;
        if (webhookResult.secret) {
          flags.clickupWebhookSecret = webhookResult.secret;
        }
        await fs.writeFile(FLAGS_PATH, JSON.stringify(flags, null, 2), "utf8");
      } catch {}

      return NextResponse.json({
        success: true,
        message: "ClickUp webhook registered successfully for taskStatusUpdated.",
        endpoint: webhookEndpoint,
        webhookId: webhookResult.id,
        secret: webhookResult.secret,
      });
    }

    if (action === "sync_task_timestamps") {
      const tasks = await getListTasks(true, "rfp", token, listId);
      const availableFields = await getListCustomFields(listId, token);
      const mapping = resolveFieldIdMapping(availableFields);

      let syncedTasksCount = 0;
      let syncedFieldsCount = 0;

      for (const task of tasks) {
        const tracked = mapClickUpTaskToTrackedRfp(task, mapping);
        if (tracked.pendingClickUpBackfill && tracked.pendingClickUpBackfill.length > 0) {
          await backfillMilestoneTimestampsToClickUp(tracked.taskId, tracked.pendingClickUpBackfill, token);
          syncedTasksCount++;
          syncedFieldsCount += tracked.pendingClickUpBackfill.length;
        }
      }

      return NextResponse.json({
        success: true,
        message: `Successfully synchronized ${syncedFieldsCount} milestone timestamp(s) across ${syncedTasksCount} task(s).`,
        syncedTasksCount,
        syncedFieldsCount,
      });
    }

    // Default: discover fields and save to settings
    const availableFields = await getListCustomFields(listId, token);
    const discoveredMapping = resolveFieldIdMapping(availableFields);
    const sharedSettings = isSupabaseAdminConfigured() ? await readPortalSettingsFromSupabase() : {};
    const mapping = { ...(sharedSettings.clickupFieldMapping || {}), ...discoveredMapping };
    const validation = validateFieldMapping(mapping);

    // Persist to featureFlags.json
    try {
      const raw = await fs.readFile(FLAGS_PATH, "utf8");
      const flags = JSON.parse(raw);
      flags.clickupFieldMapping = {
        ...(flags.clickupFieldMapping || {}),
        ...mapping,
      };
      await fs.writeFile(FLAGS_PATH, JSON.stringify(flags, null, 2), "utf8");
    } catch {
      // Ignore if read-only
    }
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
