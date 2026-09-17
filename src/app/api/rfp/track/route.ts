import { NextRequest, NextResponse } from "next/server";
import { getListTasks, getClickUpTask, backfillMilestoneTimestampsToClickUp } from "@/lib/clickup";
import { getServerAuthSession } from "@/lib/auth";
import { readFormDestinationFromSupabase } from "@/lib/supabaseAdmin";
import type { FormDestinationKey } from "@/lib/adminSettings";
import { promises as fs } from "fs";
import path from "path";
import { DEFAULT_USERS, type UserRole } from "@/lib/rbac";
import { DEFAULT_WORKFLOW_STATUSES, type WorkflowStatuses } from "@/lib/adminSettings";
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
}

async function getViewerAccess(user: { email?: string; username?: string } | null): Promise<ViewerAccess> {
  const email = (user?.email || "").trim().toLowerCase();
  const username = (user?.username || "").trim().toLowerCase();
  let users = DEFAULT_USERS;
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "src", "lib", "rbacData.json"), "utf8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) users = parsed;
  } catch {
    // The checked-in defaults are the safe fallback on read-only deployments.
  }

  const record = users.find((candidate) =>
    candidate.status === "active" && (
      candidate.email.toLowerCase() === email ||
      candidate.name.toLowerCase() === username
    )
  );
  const role = record?.role || "requestor";
  return { email, username, role, canViewAll: role !== "requestor" };
}

async function getSettingsMappingAndStatuses() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "src", "lib", "featureFlags.json"), "utf8");
    const parsed = JSON.parse(raw);
    return {
      fieldMapping: parsed.clickupFieldMapping || {},
      workflowStatuses: parsed.workflowStatuses || DEFAULT_WORKFLOW_STATUSES,
    };
  } catch {
    return {
      fieldMapping: {},
      workflowStatuses: DEFAULT_WORKFLOW_STATUSES,
    };
  }
}

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

    const settings = await getSettingsMappingAndStatuses();

    // 1. Direct ID lookup
    if (id) {
      const task = await getClickUpTask(id, accessToken);
      if (!task) {
        return NextResponse.json({ success: false, message: "Request not found" }, { status: 404 });
      }
      const parsed = mapClickUpTaskToTrackedRfp(task, settings.fieldMapping, settings.workflowStatuses);
      if (!viewer.canViewAll && !taskBelongsToViewer(parsed, viewer)) {
        return NextResponse.json({ success: false, message: "Request not found" }, { status: 404 });
      }
      scheduleBackfills([parsed], accessToken);
      return NextResponse.json({
        success: true,
        requests: [parsed],
        viewerCanViewAll: viewer.canViewAll,
      });
    }

    // 2. Fetch tasks from every configured form destination.
    const formTypes: FormDestinationKey[] = ["rfp", "gw-rfp", "travel-budget"];
    const taskGroups = await Promise.all(
      formTypes.map(async (formType) => {
        const destination = await readFormDestinationFromSupabase(formType);
        if (!destination?.enabled || !destination.listId) return [];
        return getListTasks(true, formType, accessToken, destination.listId);
      })
    );
    const allTasks = Array.from(
      new Map(taskGroups.flat().map((task) => [task.id, task])).values()
    );
    let parsed = allTasks.map((task) => mapClickUpTaskToTrackedRfp(task, settings.fieldMapping, settings.workflowStatuses));

    // Requestors are restricted server-side. Admins, approvers, and finance
    // users retain the complete queue needed for review and processing.
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

    scheduleBackfills(parsed, accessToken);

    return NextResponse.json({
      success: true,
      requests: parsed,
      count: parsed.length,
      viewerCanViewAll: viewer.canViewAll,
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
  const viewerEmail = viewer.email;
  const viewerName = viewer.username.replace(/\s+/g, " ").trim();
  if (request.requestedByEmail && viewerEmail) {
    return request.requestedByEmail === viewerEmail;
  }
  if (!viewerName || viewerName.includes("@")) return false;
  return request.requestedBy.trim().toLowerCase() === viewerName;
}

function scheduleBackfills(requests: TrackedRfp[], token?: string) {
  for (const r of requests) {
    if (r.pendingClickUpBackfill && r.pendingClickUpBackfill.length > 0) {
      void backfillMilestoneTimestampsToClickUp(r.taskId, r.pendingClickUpBackfill, token);
    }
  }
}

