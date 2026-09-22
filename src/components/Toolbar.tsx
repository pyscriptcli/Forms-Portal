"use client";

import { FileDown, RotateCcw, Send, Loader2 } from "lucide-react";
import { RequestClassification } from "@/components/RequestClassification";

interface ToolbarProps {
  onPreviewPdf: () => void;
  onReset: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  isGeneratingPdf: boolean;
  isRevision: boolean;
  taskId?: string;
  totalAmount: number;
  selectedForm?: string;
  onSelectForm?: (formKey: string) => void;
  natureOfTransaction?: string;
  onNatureOfTransactionChange?: (value: string) => void;
  hasNatureOfTransactionError?: boolean;
}

const FORM_LABELS: Record<string, string> = {
  rfp: "PRIME - REQUEST FOR PAYMENT (RFP)",
  rfb: "PRIME - REQUEST FOR BILLING (RFB)",
  "credit-sharing": "PRIME - CREDIT SHARING FORM",
  "gw-rfp": "GREATWORK - REQUEST FOR PAYMENT (RFP)",
  "gw-rfb": "GREATWORK - REQUEST FOR BILLING (RFB)",
  "gw-credit-sharing": "GREATWORK - CREDIT SHARING FORM",
  "travel-budget": "TRAVEL BUDGET - REQUEST FORM",
};

export function Toolbar({
  onPreviewPdf, onReset, onSubmit, isSubmitting, isGeneratingPdf,
  isRevision, taskId, selectedForm = "rfp", onSelectForm,
  natureOfTransaction = "", onNatureOfTransactionChange, hasNatureOfTransactionError = false,
}: ToolbarProps) {
  return (
    <div className="prime-toolbar">
      <div className="flex flex-wrap items-center gap-3 min-w-0">
        <span className="text-xs font-semibold uppercase tracking-wider text-prime-blue">
          {FORM_LABELS[selectedForm] ?? selectedForm.toUpperCase()}
        </span>
        {isRevision && <span className="text-xs text-prime-blue">Revision · #{taskId}</span>}
      </div>
      {(selectedForm === "rfp" || selectedForm === "gw-rfp") && onNatureOfTransactionChange && (
        <RequestClassification compact value={natureOfTransaction} onChange={onNatureOfTransactionChange} hasError={hasNatureOfTransactionError} />
      )}
      <div className="prime-toolbar-actions">
        <button type="button" onClick={onPreviewPdf} disabled={isGeneratingPdf} className="prime-button secondary">
          {isGeneratingPdf ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />} PDF
        </button>
        <button type="button" onClick={onReset} className="prime-button secondary"><RotateCcw size={16} />Reset</button>
        <button id="submit-to-clickup-btn" type="button" onClick={onSubmit} disabled={isSubmitting || isGeneratingPdf} className="prime-button">
          {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          {isSubmitting ? "Submitting…" : isRevision ? "Update request" : "Submit request"}
        </button>
      </div>
    </div>
  );
}
