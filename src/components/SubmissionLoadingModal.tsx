"use client";

import React from "react";
import { Loader2, Check } from "lucide-react";
import { PrimeDialog } from "./PrimeDialog";

export type SubmissionStage =
  | "rendering_pdf"
  | "packaging_attachments"
  | "uploading_clickup"
  | "finalizing";

interface SubmissionLoadingModalProps {
  isOpen: boolean;
  stage: SubmissionStage;
  entityName: string;
  totalAmount: number;
  attachmentsCount: number;
  isRevision?: boolean;
}

const STAGES: Array<{
  key: SubmissionStage;
  label: string;
  desc: string;
}> = [
  {
    key: "rendering_pdf",
    label: "Preparing document",
    desc: "Generating your signed PDF and preview.",
  },
  {
    key: "packaging_attachments",
    label: "Preparing attachments",
    desc: "Preparing quotations and supporting documents.",
  },
  {
    key: "uploading_clickup",
    label: "Uploading request",
    desc: "Sending the request for review.",
  },
  {
    key: "finalizing",
    label: "Finishing submission",
    desc: "Saving attachments and submission details.",
  },
];

export function SubmissionLoadingModal({
  isOpen,
  stage,
  entityName,
  totalAmount,
  attachmentsCount,
  isRevision = false,
}: SubmissionLoadingModalProps) {
  if (!isOpen) return null;

  const stageKeys = STAGES.map((s) => s.key);
  const currentStageIndex = stageKeys.indexOf(stage);

  const formattedAmount = Number(totalAmount || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const progressPercent = Math.min(
    100,
    Math.round(((currentStageIndex + 1) / STAGES.length) * 100)
  );

  return (
    <PrimeDialog open={isOpen} title={isRevision ? "Updating request" : "Submitting request"}>
      <p className="text-sm mb-6">Keep this page open until the upload is complete.</p>
      <div className="border-y border-prime-rule py-5 mb-6">
        <p className="prime-label text-xs">{entityName || "Document"}</p>
        <p className="font-bebas text-4xl text-prime-blue mt-2">₱{formattedAmount}</p>
        <p className="text-xs mt-1">{attachmentsCount} {attachmentsCount === 1 ? "attachment" : "attachments"}</p>
      </div>
      <div role="progressbar" aria-label="Submission progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressPercent} className="h-1 border border-prime-blue mb-6">
        <div className="h-full bg-prime-blue transition-all" style={{ width: `${progressPercent}%` }} />
      </div>
      <ol className="space-y-5" aria-live="polite">{STAGES.map((item, index) => <li key={item.key} className="flex gap-4" aria-current={index === currentStageIndex ? "step" : undefined}>
        <span className="w-7 h-7 shrink-0 border border-prime-blue flex items-center justify-center text-prime-blue">
          {index < currentStageIndex ? <Check size={16} aria-label="Complete" /> : index === currentStageIndex ? <Loader2 size={16} className="animate-spin" aria-label="In progress" /> : index + 1}
        </span>
        <div><p className="text-sm font-medium text-prime-blue">{item.label}</p><p className="text-xs mt-1">{item.desc}</p></div>
      </li>)}</ol>
    </PrimeDialog>
  );
}
