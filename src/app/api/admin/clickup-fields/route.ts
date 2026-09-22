import { NextRequest, NextResponse } from "next/server";
import {
  getClickUpConfig,
  getListCustomFields,
  createClickUpWebhook,
  getListTasks,
  getClickUpTaskTimeInStatus,
  setTaskCustomFieldValue,
} from "@/lib/clickup";
import {
  CLICKUP_MILESTONE_FIELDS,
  resolveFieldIdMapping,
  validateFieldMapping,
} from "@/lib/clickupFields";
import { getMilestoneEntries } from "@/lib/rfpWorkflow";
import { ADMIN_TOKEN, DEFAULT_WORKFLOW_STATUSES } from "@/lib/adminSettings";
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

    if (action === "sync_task_timestamps") {
      const availableFields = await getListCustomFields(listId, token);
      const fieldMapping = resolveFieldIdMapping(availableFields);
      const workflowStatuses = (await readWorkflowStatusesFromSupabase()) || DEFAULT_WORKFLOW_STATUSES;
      const statusEntries = getMilestoneEntries(workflowStatuses);
      const normalizeStatus = (value: unknown) => String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, " ");
      const entryByStatus = new Map(statusEntries.map((entry) => [normalizeStatus(entry.status), entry]));
      const tasks = await getListTasks(true, "rfp", undefined, listId, {
        includeMarkdownDescription: false,
        subtasks: false,
      });
      let timestampCount = 0;
      const updatedTaskIds = new Set<string>();

      for (const task of tasks) {
        const taskFields = Array.isArray(task.custom_fields) ? task.custom_fields : [];
        const taskMapping = {
          ...fieldMapping,
          ...resolveFieldIdMapping(taskFields.map((field: any) => ({
            id: String(field.id || ""),
            name: String(field.name || ""),
            type: String(field.type || "text"),
          }))),
        };
        const timeInStatus = await getClickUpTaskTimeInStatus(String(task.id), token);
        if (!timeInStatus) continue;
        const history = [
          ...(Array.isArray(timeInStatus.status_history) ? timeInStatus.status_history : []),
          ...(timeInStatus.current_status ? [timeInStatus.current_status] : []),
        ];
        const writtenFieldIds = new Set<string>();

        for (const statusRecord of history) {
          const entry = entryByStatus.get(normalizeStatus(statusRecord.status));
          const since = statusRecord.total_time?.since;
          const eventDate = Number(since);
          if (!entry || !Number.isFinite(eventDate) || eventDate <= 0) continue;

          const fieldName = CLICKUP_MILESTONE_FIELDS[entry.key as keyof typeof CLICKUP_MILESTONE_FIELDS];
          const fieldId = fieldName ? taskMapping[fieldName] : undefined;
          const existingField = taskFields.find((field: any) => String(field.id) === String(fieldId));
          if (!fieldId || writtenFieldIds.has(String(fieldId)) || existingField?.value !== null && existingField?.value !== undefined && existingField?.value !== "") continue;

          const written = await setTaskCustomFieldValue(String(task.id), fieldId, eventDate, token);
          if (written) {
            writtenFieldIds.add(String(fieldId));
            timestampCount += 1;
            updatedTaskIds.add(String(task.id));
          }
        }
      }

      return NextResponse.json({
        success: true,
        message: `Synchronized ${timestampCount} missing milestone timestamp${timestampCount === 1 ? "" : "s"} across ${updatedTaskIds.size} task${updatedTaskIds.size === 1 ? "" : "s"}.`,
        tasksScanned: tasks.length,
        timestampsWritten: timestampCount,
      });
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
