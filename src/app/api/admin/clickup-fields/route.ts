import { NextRequest, NextResponse } from "next/server";
import {
  getClickUpConfig,
  getListCustomFields,
  createClickUpWebhook,
  getListTasks,
  backfillMilestoneTimestampsToClickUp,
  getClickUpTaskTimeInStatus,
} from "@/lib/clickup";
import {
  resolveFieldIdMapping,
  validateFieldMapping,
  CLICKUP_MILESTONE_FIELDS,
} from "@/lib/clickupFields";
import { ORDERED_MILESTONE_KEYS, resolveRfpMilestone, getMilestoneEntries } from "@/lib/rfpWorkflow";
import { DEFAULT_WORKFLOW_STATUSES, normalizeWorkflowStatuses } from "@/lib/adminSettings";
import { invalidateRfpCache } from "@/lib/rfpCache";
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

    if (action === "sync_task_timestamps") {
      const configuredStatuses = isSupabaseAdminConfigured()
        ? await readWorkflowStatusesFromSupabase()
        : null;
      const workflowStatuses = normalizeWorkflowStatuses(configuredStatuses || DEFAULT_WORKFLOW_STATUSES);

      const tasks = await getListTasks(true, "rfp", undefined, listId);
      const availableFields = await getListCustomFields(listId, token);
      const sharedSettings = isSupabaseAdminConfigured() ? await readPortalSettingsFromSupabase() : {};
      const mapping = {
        ...resolveFieldIdMapping(availableFields),
        ...(sharedSettings.clickupFieldMapping || {}),
      };

      let syncedTasksCount = 0;
      let syncedFieldsCount = 0;
      const syncReport: string[] = [];

      for (const task of tasks) {
        const rawStatus = typeof task.status === "string" ? task.status : (task.status?.status || "");
        const statusStr = rawStatus.toLowerCase().trim();
        const normalizedStatus = statusStr.replace(/[_-]/g, " ").replace(/\s+/g, " ").trim();
        const isDone = ["done", "complete", "completed", "closed"].includes(normalizedStatus);
        const resolved = resolveRfpMilestone(rawStatus, workflowStatuses);

        const activeMilestoneIdx = ORDERED_MILESTONE_KEYS.indexOf(resolved.key);
        const effectiveMilestoneIdx = isDone ? ORDERED_MILESTONE_KEYS.length - 1 : activeMilestoneIdx;

        if (effectiveMilestoneIdx < 0) continue;

        const taskFields: Array<{ id: string; name?: string; value?: any }> = Array.isArray(task.custom_fields)
          ? task.custom_fields
          : [];
        const taskFieldMap = new Map<string, any>();
        const taskFieldNameMap = new Map<string, any>();
        for (const cf of taskFields) {
          if (cf.id) taskFieldMap.set(cf.id, cf.value);
          if (cf.name) taskFieldNameMap.set(cf.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, " "), cf.value);
        }

        const missingBackfills: Array<{ fieldId: string; timestamp: number }> = [];
        let timeInStatusData: any = null;

        for (let idx = 0; idx <= effectiveMilestoneIdx; idx++) {
          const milestoneKey = ORDERED_MILESTONE_KEYS[idx];
          const fieldName = CLICKUP_MILESTONE_FIELDS[milestoneKey];
          const fieldId = mapping[fieldName];
          if (!fieldId) continue;

          // Check both by ID and by field name
          const existingById = taskFieldMap.get(fieldId);
          const normFieldName = fieldName.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ");
          const existingByName = taskFieldNameMap.get(normFieldName);
          const existingValue = (existingById !== undefined && existingById !== null && existingById !== "")
            ? existingById
            : existingByName;

          if (existingValue !== undefined && existingValue !== null && existingValue !== "") {
            continue;
          }

          let timestamp: number = 0;
          if (idx === 0) {
            timestamp = Number(task.date_created) || Date.now();
          } else {
            if (timeInStatusData === null) {
              timeInStatusData = await getClickUpTaskTimeInStatus(task.id, token);
            }
            const expectedMilestone = getMilestoneEntries(workflowStatuses).find((e) => e.key === milestoneKey);
            const statusLabel = (expectedMilestone?.status || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, " ");

            if (timeInStatusData?.status_history && Array.isArray(timeInStatusData.status_history)) {
              const histMatch = timeInStatusData.status_history.find(
                (h: any) => (h.status || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, " ") === statusLabel
              );
              if (histMatch?.total_time?.since) {
                timestamp = Number(histMatch.total_time.since);
              }
            }

            if (!timestamp && timeInStatusData?.current_status) {
              const currentLabel = (timeInStatusData.current_status.status || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, " ");
              if (currentLabel === statusLabel) {
                timestamp = Number(timeInStatusData.current_status.total_time?.since || 0);
              }
            }

            if (!timestamp || isNaN(timestamp)) {
              timestamp = Number(task.date_updated) || Number(task.date_created) || Date.now();
            }
          }

          missingBackfills.push({ fieldId, timestamp });
        }

        if (missingBackfills.length > 0) {
          const success = await backfillMilestoneTimestampsToClickUp(task.id, missingBackfills, token);
          if (success) {
            syncedTasksCount++;
            syncedFieldsCount += missingBackfills.length;
            syncReport.push(`${task.name || task.id}: updated ${missingBackfills.length} milestone(s)`);
          }
        }
      }

      invalidateRfpCache(destination?.workspaceId, listId);

      const summary = syncedFieldsCount > 0
        ? `Successfully synchronized ${syncedFieldsCount} milestone timestamp(s) across ${syncedTasksCount} of ${tasks.length} task(s).`
        : tasks.length === 0
        ? `No tasks found in ClickUp List (${listId}). Please check that tasks exist in this list.`
        : `Scanned ${tasks.length} task(s) in list; all reached milestones already have timestamps recorded.`;

      return NextResponse.json({
        success: true,
        message: summary,
        totalTasksScanned: tasks.length,
        syncedTasksCount,
        syncedFieldsCount,
        syncReport,
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
