import { NextRequest, NextResponse } from "next/server";
import { getClickUpConfig, getListTasks, getClickUpTask } from "@/lib/clickup";
import { getServerAuthSession } from "@/lib/auth";
import { readFormDestinationFromSupabase } from "@/lib/supabaseAdmin";
import type { FormDestinationKey } from "@/lib/adminSettings";
import { type UserRole } from "@/lib/rbac";
import { DEFAULT_WORKFLOW_STATUSES, type WorkflowStatuses } from "@/lib/adminSettings";
import { readPortalSettingsFromSupabase, readWorkflowStatusesFromSupabase } from "@/lib/supabaseAdmin";
import { resolveRfpMilestone } from "@/lib/rfpWorkflow";
import {
  mapClickUpTaskToTrackedRfp,
  type TrackedRfp,
  type MilestoneTimestamps,
} from "@/lib/rfpTrackerMapping";

export type { TrackedRfp, MilestoneTimestamps };

interface ViewerAccess {
  email: string;
  username: string;
  role: UserRole;
  canViewAll: boolean;
  department: string;
}

async function getViewerAccess(user: { email?: string; username?: string } | null): Promise<ViewerAccess> {
  const email = (user?.email || "").trim().toLowerCase();
  const username = (user?.username || "").trim().toLowerCase();
  const users = await import("@/lib/supabaseAdmin").then(({ readRbacUsersFromSupabase }) => readRbacUsersFromSupabase());

  const record = users.find((candidate) =>
    candidate.status === "active" && (
      candidate.email.toLowerCase() === email ||
      candidate.name.toLowerCase() === username
    )
  );
  const role = record?.role || "requestor";
  return {
    email,
    username,
    role,
    department: record?.department?.trim().toLowerCase() || "",
    canViewAll: role === "admin" || role === "finance",
  };
}

async function getSettingsMappingAndStatuses() {
  const [portalSettings, workflowStatuses] = await Promise.all([
    readPortalSettingsFromSupabase(),
    readWorkflowStatusesFromSupabase(),
  ]);
  return {
    fieldMapping: portalSettings.clickupFieldMapping || {},
    workflowStatuses: workflowStatuses || DEFAULT_WORKFLOW_STATUSES,
  };
}

import {
  getRfpQueueFromCacheOrFetch,
  findTaskInRfpCache,
} from "@/lib/rfpCache";

export async function GET(req: NextRequest) {
  try {
    const { accessToken, user } = await getServerAuthSession();
    if (!accessToken) {
      return NextResponse.json(
        { success: false, message: "Sign in with ClickUp to view submitted requests." },
        { status: 401 }
      );
    }
    const viewer = await getViewerAccess(user);

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const query = (searchParams.get("query") || "").toLowerCase().trim();
    const dept = (searchParams.get("dept") || "").toLowerCase().trim();
    const email = (searchParams.get("email") || "").toLowerCase().trim();
    const forceRefresh = searchParams.get("forceRefresh") === "true";

    const settings = await getSettingsMappingAndStatuses();
    const rfpDestination = await readFormDestinationFromSupabase("rfp");
    if (!rfpDestination?.enabled || !rfpDestination.listId) {
      throw new Error("No enabled RFP ClickUp destination is configured in Supabase.");
    }
    // The user OAuth token is the credential for all ClickUp reads. The server
    // token is intentionally not used for request tracking.
    const rfpClickUp = getClickUpConfig("rfp", accessToken, rfpDestination.listId);
    if (!rfpClickUp.isConfigured) {
      throw new Error("The authenticated ClickUp access token is not configured for request tracking.");
    }

    const workspaceId = rfpDestination.workspaceId || "default";
    const listId = rfpDestination.listId;
    const cacheScope = user?.id ? `user:${user.id}` : `token:${accessToken}`;

    // 1. Direct ID lookup
    if (id) {
      // Check cache first
      let parsed = findTaskInRfpCache(id, workspaceId, listId, cacheScope);
      let source: "clickup" | "cache" = "cache";

      if (!parsed) {
        const task = await getClickUpTask(id, accessToken);
        if (!task) {
          return NextResponse.json({ success: false, message: "Request not found" }, { status: 404 });
        }
        parsed = mapClickUpTaskToTrackedRfp(task, settings.fieldMapping, settings.workflowStatuses);
        source = "clickup";
      }

      if (!viewer.canViewAll && !taskBelongsToViewer(parsed, viewer)) {
        return NextResponse.json({ success: false, message: "Request not found" }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        requests: [parsed],
        viewerCanViewAll: viewer.canViewAll,
        fetchedAt: new Date().toISOString(),
        isStale: false,
        source,
      });
    }

    // 2. Read through cache or fetch deduplicated from ClickUp
    const cacheResult = await getRfpQueueFromCacheOrFetch({
      workspaceId,
      listId,
      cacheScope,
      forceRefresh,
      fetcher: async () => {
        const rawTasks = await getListTasks(true, "rfp", accessToken, listId);
        return rawTasks.map((task) =>
          mapClickUpTaskToTrackedRfp(task, settings.fieldMapping, settings.workflowStatuses)
        );
      },
    });

    let parsed = [...cacheResult.requests];

    // Requestors are restricted server-side.
    if (!viewer.canViewAll) {
      parsed = parsed.filter((request) => taskBelongsToViewer(request, viewer));
    }

    // Apply filters
    if (query) {
      parsed = parsed.filter(
        (r) =>
          r.taskId.toLowerCase().includes(query) ||
          r.payee.toLowerCase().includes(query) ||
          r.department.toLowerCase().includes(query) ||
          r.purpose.toLowerCase().includes(query) ||
          r.requestedBy.toLowerCase().includes(query)
      );
    }

    if (dept && dept !== "all") {
      parsed = parsed.filter((r) => r.department.toLowerCase().includes(dept));
    }

    if (email) {
      parsed = parsed.filter((r) => {
        const emailPrefix = email.split("@")[0];
        return (
          r.requestedBy.toLowerCase().includes(emailPrefix) ||
          (r.requestedByEmail && r.requestedByEmail.toLowerCase().includes(email))
        );
      });
    }

    // Sort by creation date descending
    parsed.sort((a, b) => new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime());

    return NextResponse.json({
      success: true,
      requests: parsed,
      count: parsed.length,
      viewerCanViewAll: viewer.canViewAll,
      fetchedAt: cacheResult.fetchedAt,
      isStale: cacheResult.isStale,
      source: cacheResult.source,
      warning: cacheResult.warning,
    });
  } catch (error: any) {
    console.error("Error in /api/rfp/track:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to retrieve tracking requests" },
      { status: 500 }
    );
  }
}

function taskBelongsToViewer(request: TrackedRfp, viewer: ViewerAccess): boolean {
  if (viewer.canViewAll) return true;
  if (viewer.role === "approver") {
    return Boolean(viewer.department) && request.department.trim().toLowerCase() === viewer.department;
  }
  const viewerEmail = viewer.email;
  const viewerName = viewer.username.replace(/\s+/g, " ").trim();
  if (request.requestedByEmail && viewerEmail) {
    return request.requestedByEmail === viewerEmail;
  }
  if (!viewerName || viewerName.includes("@")) return false;
  return request.requestedBy.trim().toLowerCase() === viewerName;
}

