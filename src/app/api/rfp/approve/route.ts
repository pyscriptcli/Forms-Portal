import { NextRequest, NextResponse } from "next/server";
import {
  approveTaskByApprover,
  rejectTaskForRevision,
  getClickUpTask,
} from "@/lib/clickup";
import { sendRequestorRevisionNotification } from "@/lib/email";
import { RfpFormData } from "@/types/rfp";
import { getServerAuthSession } from "@/lib/auth";
import { readWorkflowStatusesFromSupabase } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { taskId, action, approverName, approverEmail, notes, revisionReason, actorRole, signatureDataUrl, approvalDate } = body;

    if (!taskId || !action) {
      return NextResponse.json(
        { success: false, message: "Missing taskId or action" },
        { status: 400 }
      );
    }

    const host = req.headers.get("host") || "localhost:3000";
    const protocol = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;

    if (action === "approve") {
      if (!approverName?.trim() || !signatureDataUrl?.startsWith("data:image/") || !approvalDate?.trim()) {
        return NextResponse.json(
          { success: false, message: "Approver name, signature, and approval date are required" },
          { status: 400 }
        );
      }

      const [{ accessToken, user }, workflowStatuses] = await Promise.all([
        getServerAuthSession(),
        readWorkflowStatusesFromSupabase(),
      ]);
      const success = await approveTaskByApprover(
        taskId,
        approverName.trim(),
        notes,
        approverEmail || user?.email,
        {
          oauthToken: accessToken || undefined,
          workflowStatuses: workflowStatuses || undefined,
          signatureDataUrl,
          approvalDate: approvalDate.trim(),
        }
      );

      if (!success) {
        return NextResponse.json(
          { success: false, message: "Failed to update ClickUp task approval status" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
          message: `Request #${taskId} endorsed successfully! Advanced to Finance Validation.`,
      });
    }

    if (action === "reject") {
      if (!revisionReason) {
        return NextResponse.json(
          { success: false, message: "Please provide a reason for the revision request" },
          { status: 400 }
        );
      }

      const success = await rejectTaskForRevision(
        taskId,
        approverName || (actorRole === "finance" ? "Finance Officer" : "Team Leader"),
        revisionReason,
        actorRole || "tl"
      );

      if (!success) {
        return NextResponse.json(
          { success: false, message: "Failed to record revision in ClickUp" },
          { status: 500 }
        );
      }

      // Fetch task details to notify requestor via Outlook email
      try {
        const task = await getClickUpTask(taskId);
        if (task) {
          const dummyFormData: Partial<RfpFormData> = {
            payee: task.name,
          };
          await sendRequestorRevisionNotification({
            data: dummyFormData as RfpFormData,
            taskId,
            revisionReason,
            appUrl,
          });
        }
      } catch (emailErr) {
        console.warn("Could not dispatch revision notification email:", emailErr);
      }

      return NextResponse.json({
        success: true,
        message: `Revision request recorded for RFP #${taskId}. Requestor has been notified.`,
      });
    }

    return NextResponse.json(
      { success: false, message: "Invalid action specified" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Error in /api/rfp/approve:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error in approval processing" },
      { status: 500 }
    );
  }
}
