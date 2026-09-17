import { NextRequest, NextResponse } from "next/server";
import { FormType } from "@/types/rfp";
import { createClickUpTask, deleteClickUpTask, getClickUpConfig, readNextRfpReferenceFromClickUp, updateClickUpTask, uploadAttachmentToTask } from "@/lib/clickup";
import { sendApproverNotification } from "@/lib/email";
import { fetchClickUpUser, getServerAuthSession } from "@/lib/auth";
import { readFormDestinationFromSupabase, readWorkflowStatusesFromSupabase } from "@/lib/supabaseAdmin";
import { formatSubmittedFilename } from "@/lib/rfpNaming";
import { getSubmissionPayloadSize, MAX_SUBMISSION_PAYLOAD_BYTES } from "@/lib/submissionUploads";
import { invalidateRfpCache } from "@/lib/rfpCache";

export const maxDuration = 60;

interface AttachmentEntry {
  file: File;
  filename: string;
}

async function uploadAttachments(taskId: string, entries: AttachmentEntry[], accessToken: string) {
  let nextIndex = 0;
  let firstError: Error | null = null;
  const worker = async () => {
    while (!firstError && nextIndex < entries.length) {
      const entry = entries[nextIndex++];
      const result = await uploadAttachmentToTask(taskId, entry.file, entry.filename, accessToken);
      if (!result.success) firstError = new Error(result.error || `ClickUp could not save ${entry.filename}.`);
    }
  };
  await Promise.all(Array.from({ length: Math.min(2, entries.length) }, worker));
  if (firstError) throw firstError;
}

export async function POST(req: NextRequest) {
  let createdTaskId = "";
  let accessToken = "";

  try {
    const session = await getServerAuthSession();
    accessToken = session.accessToken || "";
    if (!accessToken) {
      return NextResponse.json({ success: false, message: "Sign in with ClickUp before submitting a request." }, { status: 401 });
    }

    const formData = await req.formData();
    const dataStr = String(formData.get("data") || "");
    const formType = String(formData.get("formType") || "rfp") as FormType;
    const pdfBlob = formData.get("pdf");
    const previewImageBlob = formData.get("previewImage");
    const supportingFiles = formData.getAll("supportingFiles").filter((file): file is File => file instanceof File && file.size > 0);

    if (!dataStr) return NextResponse.json({ success: false, message: "Missing form data payload" }, { status: 400 });
    if (!(pdfBlob instanceof File) || pdfBlob.size === 0) {
      return NextResponse.json({ success: false, message: "The form PDF was not generated. Nothing was submitted." }, { status: 400 });
    }

    const submittedFiles = [
      pdfBlob,
      ...(previewImageBlob instanceof File && previewImageBlob.size > 0 ? [previewImageBlob] : []),
      ...supportingFiles,
    ];
    if (getSubmissionPayloadSize(dataStr, submittedFiles) > MAX_SUBMISSION_PAYLOAD_BYTES) {
      return NextResponse.json(
        { success: false, message: "The complete submission exceeds the 4 MB limit. Remove attachments or use smaller files." },
        { status: 413 }
      );
    }

    const data: any = JSON.parse(dataStr);
    const [user, destination, workflowStatuses] = await Promise.all([
      fetchClickUpUser(accessToken),
      readFormDestinationFromSupabase(formType as "rfp" | "gw-rfp" | "travel-budget"),
      readWorkflowStatusesFromSupabase(),
    ]);
    if (user?.email && (formType === "rfp" || formType === "gw-rfp")) {
      data.requestedByEmail = user.email;
      data.requestedByName = data.requestedByName || user.username;
    }

    const destinationListId = destination?.enabled ? destination.listId : undefined;
    if (!destinationListId) throw new Error(`No enabled ClickUp destination List is configured for ${formType}.`);
    data.clickupWorkspaceId = destination?.workspaceId || "";

    if ((formType === "rfp" || formType === "gw-rfp") && !data.taskId) {
      const submissionDate = new Date(data.date || Date.now());
      const referenceMonth = `${String(submissionDate.getMonth() + 1).padStart(2, "0")}${submissionDate.getFullYear()}`;
      data.entityCode = data.entityCode || (formType === "gw-rfp" ? "GW" : "PRIME");
      const serverClickUp = getClickUpConfig("rfp", undefined, destinationListId);
      if (!serverClickUp.isConfigured) throw new Error("The server-side ClickUp API token is not configured for RFP numbering.");
      data.rfpCodeSuffix = (await readNextRfpReferenceFromClickUp(referenceMonth, serverClickUp.token, destinationListId)).reference;
    }

    const host = req.headers.get("host") || "localhost:3000";
    const protocol = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;
    const isRevision = Boolean(data.taskId);
    const taskResult = isRevision && data.taskId
      ? await updateClickUpTask(data.taskId, data, appUrl, formType, accessToken, destinationListId)
      : await createClickUpTask(data, appUrl, formType, accessToken, destinationListId, workflowStatuses || undefined);

    if (taskResult.isMock || taskResult.id.startsWith("MOCK-")) {
      throw new Error("ClickUp did not create a real task. Check the ClickUp token and destination List ID.");
    }
    if (!isRevision) createdTaskId = taskResult.id;

    const typeLabel = formType === "gw-rfp" ? "GW-RFP" : formType.toUpperCase();
    const entityName = formType === "po" ? (data.vendorName || "Vendor") : (data.payee || "Payee");
    const sanitizedName = entityName.replace(/[^a-zA-Z0-9_-]/g, "_");
    const isRfp = formType === "rfp" || formType === "gw-rfp";
    const attachmentEntries: AttachmentEntry[] = [
      {
        file: pdfBlob,
        filename: isRfp
          ? formatSubmittedFilename(data.rfpCodeSuffix, "RFP", data.payee || "Payee")
          : `${typeLabel}_${sanitizedName}_${data.date || "document"}.pdf`,
      },
      ...(previewImageBlob instanceof File && previewImageBlob.size > 0
        ? [{ file: previewImageBlob, filename: previewImageBlob.name || `${typeLabel}_${sanitizedName}_Preview.jpg` }]
        : []),
      ...supportingFiles.map((file, index) => ({
        file,
        filename: isRfp
          ? formatSubmittedFilename(data.rfpCodeSuffix, "SUP", data.payee || "Payee", undefined, index + 1)
          : file.name,
      })),
    ];
    await uploadAttachments(taskResult.id, attachmentEntries, accessToken);

    if (formType === "rfp" && (data.approverEmail || data.approverName || data.approvedByName)) {
      try {
        await sendApproverNotification({
          approverEmail: data.approverEmail,
          approverName: data.approverName || data.approvedByName,
          data,
          taskId: taskResult.id,
          appUrl,
        });
      } catch (emailError) {
        console.warn("Could not dispatch approver notification email:", emailError);
      }
    }

    invalidateRfpCache(destination?.workspaceId, destination?.listId);

    const docName = formType === "po" ? "Purchase Order (PO)" : formType === "pcv" ? "Petty Cash Voucher (PCV)" : formType === "gw-rfp" ? "GW Request for Payment (RFP)" : formType === "travel-budget" ? "Travel Budget Request Form" : "Request for Payment (RFP)";
    return NextResponse.json({
      success: true,
      taskId: taskResult.id,
      isMock: false,
      requestId: data.rfpCodeSuffix || "Pending Finance number",
      requestName: taskResult.name,
      message: isRevision ? `${docName} revised and updated in ClickUp successfully!` : `${docName} submitted and created in ClickUp successfully!`,
    });
  } catch (error: any) {
    console.error("Error in /api/rfp/submit:", error);
    let message = error.message || "Internal server error submitting RFP to ClickUp";
    if (createdTaskId && accessToken) {
      try {
        await deleteClickUpTask(createdTaskId, accessToken);
        message = `${message} The incomplete ClickUp request was removed.`;
      } catch (rollbackError: any) {
        console.error("ClickUp rollback failed:", rollbackError);
        message = `${message} Automatic cleanup failed; contact an administrator to remove task ${createdTaskId}.`;
      }
    }
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
