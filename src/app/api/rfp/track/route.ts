import { NextRequest, NextResponse } from "next/server";
import { getListTasks, getClickUpTask } from "@/lib/clickup";
import { getServerAuthSession } from "@/lib/auth";
import { readFormDestinationFromSupabase } from "@/lib/supabaseAdmin";
import type { FormDestinationKey } from "@/lib/adminSettings";

export interface TrackedRfp {
  taskId: string;
  taskName: string;
  taskUrl: string;
  formType: "rfp" | "gw-rfp" | "travel-budget" | "po" | "pcv";
  payee: string;
  department: string;
  totalAmount: number;
  dateNeeded: string;
  urgency: "urgent" | "normal";
  purpose: string;
  requestedBy: string;
  requestedByEmail?: string;
  currentStage:
    | "submitted"
    | "endorsed"
    | "finance_verification"
    | "disbursement_prep"
    | "executive_signoff"
    | "completed"
    | "revision_requested";
  stageLabel: string;
  stageIndex: number; // 0 to 5
  isRevisionRequested: boolean;
  revisionReason?: string;
  revisionBy?: "tl" | "finance" | "approver";
  dateCreated: string;
  attachments: Array<{ id: string; name: string; url: string; type?: string }>;
}

function parseTaskToTrackedRfp(task: any): TrackedRfp {
  const statusStr = (task.status?.status || "").toLowerCase();
  const desc = task.markdown_description || task.description || "";

  // Identify form type
  let formType: "rfp" | "po" | "pcv" = "rfp";
  if (task.name.includes("[PO]") || desc.includes("Purchase Order (PO)")) {
    formType = "po";
  } else if (task.name.includes("[PCV]") || desc.includes("Petty Cash Voucher (PCV)")) {
    formType = "pcv";
  }

  // Extract payee/vendor, department, amount from task name or custom fields
  let payee = "";
  let department = "";
  let totalAmount = 0;
  let dateNeeded = "";
  const urgency: "urgent" | "normal" = task.priority?.priority === "urgent" ? "urgent" : "normal";
  let purpose = "";
  let requestedBy = "";
  const requestedByEmail = "";

  // Read from custom fields if available
  if (Array.isArray(task.custom_fields)) {
    task.custom_fields.forEach((cf: any) => {
      const name = (cf.name || "").toLowerCase();
      if (name.includes("payee") && cf.value) payee = String(cf.value);
      else if (name.includes("dept") && cf.value) department = String(cf.value);
      else if (name.includes("amount") && cf.value) totalAmount = Number(cf.value) || 0;
      else if (name.includes("purpose") && cf.value) purpose = String(cf.value);
      else if (name.includes("requestor") || name.includes("requestedby")) {
        if (typeof cf.value === "string") requestedBy = cf.value;
      }
    });
  }

  // Fallbacks from Task Name: [URGENT] [FORM] Entity — ₱Total (Dept)
  if (!payee || !department) {
    const nameMatch = task.name.match(/(?:\[(?:RFP|PO|PCV)[^\]]*\]\s*)(.+?)\s*—\s*₱?([\d,.]+)\s*(?:\((.+?)\))?/i);
    if (nameMatch) {
      if (!payee) payee = nameMatch[1].trim();
      if (!totalAmount) totalAmount = parseFloat(nameMatch[2].replace(/,/g, "")) || 0;
      if (!department && nameMatch[3]) department = nameMatch[3].trim();
    } else {
      payee = payee || task.name.replace(/^🚨?\s*\[.*?\]\s*/, "");
    }
  }

  // Parse details from Markdown Description table if missing
  if (!purpose) {
    const purposeMatch = desc.match(/\|\s*\*\*(?:Purpose|Notes|Particulars)\*\*\s*\|\s*(.+?)\s*\|/);
    if (purposeMatch) purpose = purposeMatch[1].replace(/_No purpose stated\._|_No additional notes\._/, "").trim();
  }
  if (!requestedBy) {
    const reqMatch = desc.match(/\|\s*\*\*(?:Requested By|Prepared By)\*\*\s*\|\s*\*\*?(.+?)\*\*?\s*(?:\(|$)/);
    if (reqMatch) requestedBy = reqMatch[1].trim();
  }
  if (!dateNeeded) {
    const dateMatch = desc.match(/\|\s*\*\*Date Needed\*\*\s*\|\s*\*\*?(.+?)\*\*?\s*(?:\(|$)/);
    if (dateMatch) dateNeeded = dateMatch[1].trim();
    else if (task.due_date) {
      dateNeeded = new Date(Number(task.due_date)).toISOString().split("T")[0];
    }
  }

  // 5-Stage Checklist Detection
  const isBox1Checked = /\[[xX]\]\s*(?:\*\*)?1\./.test(desc);
  const isBox2Checked = /\[[xX]\]\s*(?:\*\*)?2\./.test(desc);
  const isBox3Checked = /\[[xX]\]\s*(?:\*\*)?3\./.test(desc);
  const isBox4Checked = /\[[xX]\]\s*(?:\*\*)?4\./.test(desc);
  const isBox5Checked = /\[[xX]\]\s*(?:\*\*)?5\./.test(desc);

  const isDone = statusStr === "done" || statusStr === "complete" || statusStr === "closed";
  const isOngoing = statusStr === "on going" || statusStr === "in progress";

  let isRevisionRequested = false;
  let revisionReason = "";
  let revisionBy: "tl" | "finance" | "approver" = "approver";

  if (desc.includes("Revision Requested") || task.name.toLowerCase().includes("revision")) {
    isRevisionRequested = true;
    const revMatch = desc.match(/(?:\*\*)?Reason:(?:\*\*)?\s*([^\n\r]+)/i);
    if (revMatch) {
      revisionReason = revMatch[1].trim();
    }
    if (/Revision Requested by Finance/i.test(desc)) {
      revisionBy = "finance";
    } else {
      revisionBy = "tl";
    }
  }

  let currentStage: TrackedRfp["currentStage"] = "submitted";
  let stageLabel = "Submitted (Pending Endorsement)";
  let stageIndex = 0;

  if (isBox5Checked || isDone) {
    currentStage = "completed";
    stageLabel = "Payment Released & Completed";
    stageIndex = 5;
  } else if (isBox4Checked) {
    currentStage = "executive_signoff";
    stageLabel = "Executive Sign-Off (CFO & CEO)";
    stageIndex = 4;
  } else if (isBox3Checked) {
    currentStage = "disbursement_prep";
    stageLabel = "Disbursement Preparation (UB / Check)";
    stageIndex = 3;
  } else if (isBox2Checked) {
    currentStage = "finance_verification";
    stageLabel = "Finance Verification (Zoho & Top Sheet)";
    stageIndex = 2;
  } else if (isBox1Checked || isOngoing) {
    currentStage = "endorsed";
    stageLabel = "Endorsed by Team Leader";
    stageIndex = 1;
  } else {
    currentStage = "submitted";
    stageLabel = "Submitted (Pending Endorsement)";
    stageIndex = 0;
  }

  if (isRevisionRequested) {
    currentStage = "revision_requested";
    stageLabel =
      revisionBy === "finance"
        ? "Revision Requested by Finance"
        : "Revision Requested by Team Leader";
    if (revisionBy === "finance" && stageIndex < 2) {
      stageIndex = 2;
    }
  }

  // Attachments
  const attachments = Array.isArray(task.attachments)
    ? task.attachments.map((att: any) => ({
        id: att.id,
        name: att.name || "Attachment",
        url: att.url,
        type: att.mimetype || att.type,
      }))
    : [];

  return {
    taskId: task.id,
    taskName: task.name,
    taskUrl: task.url || `https://app.clickup.com/t/${task.id}`,
    formType,
    payee,
    department: department || "General",
    totalAmount,
    dateNeeded,
    urgency,
    purpose,
    requestedBy: requestedBy || "Team Member",
    requestedByEmail,
    currentStage,
    stageLabel,
    stageIndex,
    isRevisionRequested,
    revisionReason,
    dateCreated: task.date_created ? new Date(Number(task.date_created)).toISOString() : new Date().toISOString(),
    attachments,
  };
}

export async function GET(req: NextRequest) {
  try {
    const { accessToken } = await getServerAuthSession();
    if (!accessToken) {
      return NextResponse.json(
        { success: false, message: "Sign in with ClickUp to view submitted requests." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const query = (searchParams.get("query") || "").toLowerCase().trim();
    const dept = (searchParams.get("dept") || "").toLowerCase().trim();
    const email = (searchParams.get("email") || "").toLowerCase().trim();

    // 1. Direct ID lookup
    if (id) {
      const task = await getClickUpTask(id, accessToken);
      if (!task) {
        return NextResponse.json({ success: false, message: "Request not found" }, { status: 404 });
      }
      return NextResponse.json({
        success: true,
        requests: [parseTaskToTrackedRfp(task)],
      });
    }

    // 2. Fetch tasks from every configured form destination.
    const formTypes: FormDestinationKey[] = ["rfp", "gw-rfp", "travel-budget", "po", "pcv"];
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
    let parsed = allTasks.map(parseTaskToTrackedRfp);

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
    });
  } catch (error: any) {
    console.error("Error in /api/rfp/track:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to retrieve tracking requests" },
      { status: 500 }
    );
  }
}
