"use client";

import { FileDown, RotateCcw, Send, Loader2 } from "lucide-react";

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
  onPreFillDemo?: () => void;
}

export function Toolbar({
  onPreviewPdf, onReset, onSubmit, isSubmitting, isGeneratingPdf,
  isRevision, taskId, selectedForm = "rfp", onSelectForm, onPreFillDemo,
}: ToolbarProps) {
  return (
    <div className="prime-toolbar">
      <div className="flex flex-wrap items-center gap-3 min-w-0">
        <select id="active-form-selector" value={selectedForm} onChange={(e) => onSelectForm?.(e.target.value)} className="prime-field" aria-label="Form type">
          <option value="rfp">Request for Payment</option>
          <option value="po">Purchase Order</option>
          <option value="pcv">Petty Cash Voucher</option>
        </select>
        {isRevision && <span className="text-xs text-prime-blue">Revision · #{taskId}</span>}
        {onPreFillDemo && <button type="button" onClick={onPreFillDemo} className="text-xs underline underline-offset-4 text-prime-blue min-h-11">Fill sample</button>}
      </div>
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
