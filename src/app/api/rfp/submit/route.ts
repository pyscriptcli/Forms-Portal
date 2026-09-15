import { NextRequest, NextResponse } from "next/server";
import { RfpFormData, FormType } from "@/types/rfp";
import {
  createClickUpTask,
  updateClickUpTask,
  uploadAttachmentToTask,
} from "@/lib/clickup";
import { sendApproverNotification } from "@/lib/email";
import { getServerAuthSession } from "@/lib/auth";
import { readFormDestinationFromSupabase, readWorkflowStatusesFromSupabase } from "@/lib/supabaseAdmin";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { accessToken } = await getServerAuthSession();
    if (!accessToken) {
      return NextResponse.json(
        { success: false, message: "Sign in with ClickUp before submitting a request." },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const dataStr = formData.get("data") as string;
    const formType = ((formData.get("formType") as string) || "rfp") as FormType;

    if (!dataStr) {
      return NextResponse.json(
        { success: false, message: "Missing form data payload" },
        { status: 400 }
      );
    }

    const data: any = JSON.parse(dataStr);
    const [destination, workflowStatuses] = await Promise.all([
      readFormDestinationFromSupabase(formType as "rfp" | "gw-rfp" | "travel-budget" | "po" | "pcv"),
      readWorkflowStatusesFromSupabase(),
    ]);
    const destinationListId = destination?.enabled ? destination.listId : undefined;
    if (!destinationListId) {
      throw new Error(`No enabled ClickUp destination List is configured for ${formType}.`);
    }
    data.clickupWorkspaceId = destination?.workspaceId || "";

    // Determine application base URL
    const host = req.headers.get("host") || "localhost:3000";
    const protocol = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;

    let taskResult;
    const isRevision = Boolean(data.taskId);

    if (isRevision && data.taskId) {
      taskResult = await updateClickUpTask(data.taskId, data, appUrl, formType, accessToken, destinationListId);
    } else {
      taskResult = await createClickUpTask(data, appUrl, formType, accessToken, destinationListId, workflowStatuses || undefined);
    }

    if (taskResult.isMock || taskResult.id.startsWith("MOCK-")) {
      throw new Error("ClickUp did not create a real task. Check the ClickUp token and destination List ID.");
    }

    const taskId = taskResult.id;

    if (taskId) {
      const typeLabel = formType === "gw-rfp" ? "GW-RFP" : formType.toUpperCase();
      const entityName = formType === "po" ? (data.vendorName || "Vendor") : (data.payee || "Payee");
      const sanitizedName = entityName.replace(/[^a-zA-Z0-9_-]/g, "_");

      // 1. Upload high-res visual preview image of the form (appears in ClickUp right sidebar)
      const previewImageBlob = formData.get("previewImage") as File | null;
      if (previewImageBlob) {
        const previewFilename = previewImageBlob.name || `${typeLabel}_${sanitizedName}_Preview.jpg`;
        await uploadAttachmentToTask(taskId, previewImageBlob, previewFilename, accessToken);
      }

      // 2. Upload official generated PDF document
      const pdfBlob = formData.get("pdf") as File | null;
      if (!pdfBlob || pdfBlob.size === 0) {
        throw new Error("The form PDF was not generated. The submission was not completed.");
      }
      const pdfFilename = `${typeLabel}_${sanitizedName}_${data.date || "document"}.pdf`;
      const pdfUpload = await uploadAttachmentToTask(taskId, pdfBlob, pdfFilename, accessToken);
      if (!pdfUpload.success) {
        throw new Error("The form PDF could not be uploaded to ClickUp. The submission was not completed.");
      }

      // 3. Upload all supporting documents
      const supportingFiles = formData.getAll("supportingFiles") as File[];
      if (supportingFiles && supportingFiles.length > 0) {
        for (const file of supportingFiles) {
          if (file && file.size > 0) {
            await uploadAttachmentToTask(taskId, file, file.name, accessToken);
          }
        }
      }

      // 4. Dispatch Outlook email notification to Approver if applicable
      if (formType === "rfp" && (data.approverEmail || data.approverName || data.approvedByName)) {
        try {
          await sendApproverNotification({
            approverEmail: data.approverEmail,
            approverName: data.approverName || data.approvedByName,
            data,
            taskId,
            appUrl,
          });
        } catch (emailErr) {
          console.warn("Could not dispatch approver notification email:", emailErr);
        }
      }
    }

    const docName = formType === "po" ? "Purchase Order (PO)" : formType === "pcv" ? "Petty Cash Voucher (PCV)" : formType === "gw-rfp" ? "GW Request for Payment (RFP)" : formType === "travel-budget" ? "Travel Budget Request Form" : "Request for Payment (RFP)";

    return NextResponse.json({
      success: true,
      taskId: taskResult.id,
      taskUrl: taskResult.url,
      isMock: taskResult.isMock || false,
      requestId: `RFP-${String(data.rfpCodeSuffix || "0000001").replace(/^RFP-/, "")}`,
      message: isRevision
        ? `${docName} revised and updated in ClickUp successfully!`
        : `${docName} submitted and created in ClickUp successfully!`,
      taskData: taskResult,
    });
  } catch (error: any) {
    console.error("Error in /api/rfp/submit:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Internal server error submitting RFP to ClickUp",
      },
      { status: 500 }
    );
  }
}
