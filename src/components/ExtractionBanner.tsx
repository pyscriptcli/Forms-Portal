"use client";

import React from "react";
import { CheckCircle2, RotateCcw, X } from "lucide-react";

interface ExtractionBannerProps {
  vendorName: string;
  itemsCount: number;
  totalAmount: number;
  onUndo: () => void;
  onDismiss: () => void;
}

export function ExtractionBanner({
  vendorName,
  itemsCount,
  totalAmount,
  onUndo,
  onDismiss,
}: ExtractionBannerProps) {
  const formattedTotal = Number(totalAmount || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div className="w-full mb-4 bg-prime-blue text-prime-white p-3.5 border-l-4 border-prime-gold shadow-none flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in duration-300">
      <div className="flex items-center gap-3">
        <CheckCircle2 className="w-5 h-5 text-prime-blue shrink-0" />
        <div className="text-xs">
          <span className="font-medium">Quotation Auto-Fill Applied:</span>{" "}
          <span>
            Loaded <strong className="text-prime-blue">{itemsCount} line items</strong> from{" "}
            <strong className="text-prime-white">{vendorName || "Vendor"}</strong>
          </span>
          <span className="ml-2 font-bebas text-sm text-prime-blue tracking-wide">
            (₱{formattedTotal})
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onUndo}
          className="px-3 py-1 text-xs font-medium uppercase tracking-wider text-prime-blue hover:text-prime-white border border-prime-gold hover:border-prime-rule transition-colors flex items-center gap-1 cursor-pointer"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Undo</span>
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="p-1 text-prime-ink hover:text-prime-white transition-colors cursor-pointer"
          title="Dismiss banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
