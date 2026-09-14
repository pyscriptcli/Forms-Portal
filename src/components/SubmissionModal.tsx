"use client";

import React, { useState } from "react";
import { CheckCircle2, ExternalLink, Download, Copy, Check } from "lucide-react";
import { SubmissionResponse } from "@/types/rfp";
import { PrimeDialog } from "./PrimeDialog";
import { downloadPdfBlob } from "@/lib/pdfGenerator";

interface SubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  response: SubmissionResponse | null;
  pdfBlob: Blob | null;
  payeeName: string;
}

export function SubmissionModal({
  isOpen,
  onClose,
  response,
  pdfBlob,
  payeeName,
}: SubmissionModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !response) return null;

  const editUrl = typeof window !== "undefined"
    ? `${window.location.origin}${window.location.pathname}?taskId=${response.taskId}`
    : "";

  const handleCopyLink = () => {
    if (editUrl) {
      navigator.clipboard.writeText(editUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleDownload = () => {
    if (pdfBlob) {
      const sanitized = (payeeName || "Request").replace(/[^a-zA-Z0-9_-]/g, "_");
      downloadPdfBlob(pdfBlob, `RFP_${sanitized}_${new Date().toISOString().split("T")[0]}.pdf`);
    }
  };

  return (
    <PrimeDialog open={isOpen} title="Request submitted" onClose={onClose}
      actions={<button type="button" onClick={onClose} className="prime-button">Done</button>}>
      <div className="space-y-6">
        <div className="flex items-start gap-3"><CheckCircle2 className="text-prime-blue shrink-0 mt-1" /><p>{response.message || "Your request has been processed."}</p></div>
        {response.isMock && <p className="prime-notice text-sm">Preview submission only. No live request was sent.</p>}
        <div className="border-y border-prime-rule py-5 flex flex-wrap items-center justify-between gap-4">
          <div><p className="prime-label text-xs">Request ID</p><p className="font-bebas text-4xl text-prime-blue mt-2">#{response.taskId}</p></div>
          {response.taskUrl && !response.isMock && <a className="prime-button secondary" href={response.taskUrl} target="_blank" rel="noreferrer">View request <ExternalLink size={16} /></a>}
        </div>
        <p className="text-sm">Follow the review and payment stages on the request status page.</p>
        <div className="flex flex-wrap gap-3">
          {pdfBlob && <button type="button" onClick={handleDownload} className="prime-button secondary"><Download size={16} /> Download PDF</button>}
          <a href={`/track?id=${response.taskId}`} className="prime-button">Track status</a>
          <button type="button" onClick={handleCopyLink} className="prime-button secondary">{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? "Copied" : "Copy link"}</button>
        </div>
      </div>
    </PrimeDialog>
  );
}
