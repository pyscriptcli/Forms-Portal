"use client";

import Link from "next/link";
import { ArrowRight, FileDown, Printer } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

const LANES = [
  { name: "Requestor", role: "Submit & track", steps: [
    ["Forms Portal", "Select Request for Payment, Purchase Order, or Petty Cash Voucher."],
    ["Prepare", "Complete the form directly in the portal. Use quotation autofill when available and review the extracted values."],
    ["Attach", "Add the vendor quotation, invoice, receipt, or statement of account."],
    ["Submit", "Submit to generate the PDF and upload the form and supporting documents to ClickUp."],
    ["Track", "Follow the six stages in Request status. If revision is requested, read the feedback, update the form, and resubmit."],
  ]},
  { name: "Department head", role: "Review & endorse", steps: [
    ["Review", "Open Approvals or follow the email / ClickUp notification."],
    ["Verify", "Review the form and its supporting attachments."],
    ["Decision", "Approve and endorse to Finance, or request a revision with feedback for the requestor."],
    ["Endorsed", "Record the endorsement in ClickUp and advance to Finance Verification."],
  ]},
  { name: "Finance & accounting", role: "Verify & disburse", steps: [
    ["Verify", "Review the request and supporting documents. Encode and upload the form in Zoho Books."],
    ["Prepare", "Prepare the top sheet. Upload the payment to UnionBank or prepare the check."],
    ["Executive review", "Send the batch and top sheet to the CFO. Log and monitor the check through executive sign-off."],
    ["Reconcile", "Monitor the expense summary and record disbursements in Zoho Books."],
    ["Release", "Save the scanned check or UnionBank confirmation to the task, release payment, and email proof of payment."],
    ["Complete", "Print APV and CV, file the documents, and mark the ClickUp task completed."],
  ]},
  { name: "CFO", role: "Review disbursement", steps: [
    ["Receive", "Receive the batch and top sheet from Finance."],
    ["Review", "Review the request and issue the check. Approve the UnionBank batch or check voucher."],
    ["Hand off", "Pass the approved batch to the CEO for final sign-off."],
  ]},
  { name: "CEO", role: "Authorize release", steps: [
    ["Receive", "Receive the CFO-approved batch."],
    ["Sign off", "Sign the check or authorize payment in UnionBank."],
    ["Return", "Return signed checks to Finance to log and release payment."],
  ]},
];
const STAGES = ["Submitted", "Endorsed", "Finance verification", "Disbursement preparation", "Executive sign-off", "Completed"];

export default function WorkflowPage() {
  return (
    <div className="prime-page">
      <PageHeader title="Request workflow" description="Responsibilities and handoffs, from the first form to payment release." actions={
        <div className="flex flex-wrap gap-2 no-print">
          <button className="prime-button secondary" onClick={() => window.print()}><Printer size={16} />Print</button>
          <a className="prime-button secondary" href="/PRIME-Forms-Portal-Optimized-Workflow.pdf" download><FileDown size={16} />Source PDF</a>
        </div>
      } />
      <ol className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 border-y border-prime-rule mb-8" aria-label="Request stages">
        {STAGES.map((stage, i) => <li key={stage} className="px-4 py-5 flex items-start gap-3">
          <span className="prime-impact text-prime-blue text-4xl">{String(i + 1).padStart(2, "0")}</span>
          <span className="text-xs mt-2">{stage}</span>
        </li>)}
      </ol>
      <div className="overflow-x-auto">
        <div className="prime-workflow-grid">
          {LANES.map(lane => <section key={lane.name} className="prime-workflow-lane">
            <header><p className="prime-label">{lane.role}</p><h2>{lane.name}</h2></header>
            <ol>{lane.steps.map(([label, detail]) => <li key={label}><p className="prime-label">{label}</p><p>{detail}</p></li>)}</ol>
          </section>)}
        </div>
      </div>
      <div className="flex flex-wrap gap-4 mt-8 no-print">
        <Link href="/" className="prime-button">Create a form <ArrowRight size={16} /></Link>
        <Link href="/track" className="prime-button secondary">Track a request</Link>
      </div>
    </div>
  );
}
