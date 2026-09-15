"use client";

import React from "react";
import { AlertCircle, ArrowUpRight, ChevronRight, X } from "lucide-react";
import { ValidationErrorItem, scrollToFormField } from "@/lib/rfpValidation";

interface ValidationAlertBannerProps {
  items: ValidationErrorItem[];
  onDismiss: () => void;
}

export function ValidationAlertBanner({ items, onDismiss }: ValidationAlertBannerProps) {
  if (!items || items.length === 0) return null;

  const handleJumpToFirst = () => {
    if (items[0]) {
      scrollToFormField(items[0].id);
    }
  };

  return (
    <div className="w-full mb-6 bg-white border-2 border-red-600 p-4 shadow-lg relative animate-shake">
      {/* Top Section */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-red-600 text-white shrink-0 mt-0.5 shadow-xs">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-red-700 uppercase tracking-wider flex items-center gap-2">
              <span>Required Information Missing</span>
              <span className="bg-red-100 text-red-800 border border-red-300 text-[11px] px-2 py-0.5 font-bold font-sans tabular-nums">
                {items.length} {items.length === 1 ? "field" : "fields"} missed
              </span>
            </h4>
            <p className="text-xs text-red-950 font-medium mt-1">
              All official form fields must be completed before submitting. Click any red tag below to jump directly to it:
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleJumpToFirst}
            className="hidden sm:flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer shadow-xs"
          >
            <span>Fix First Field</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="p-1 text-red-700 hover:text-red-900 hover:bg-red-50 transition-colors cursor-pointer"
            title="Dismiss warning"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Action Directive Callout */}
      <div className="mt-3 p-3 bg-red-50/90 border-l-4 border-red-600 text-xs text-red-950 flex items-start gap-2.5 leading-relaxed">
        <span className="font-bold uppercase tracking-wider text-red-700 text-[11px] shrink-0 pt-0.5">
          Directive:
        </span>
        <div>
          To complete your submission, fill in each required item highlighted in <span className="font-bold text-red-700">red</span> on the form below. You can click any red tag below to jump directly to that input, or use the <strong>RFP Auto-Fill</strong> section above to upload a quotation/receipt and populate these details automatically.
        </div>
      </div>

      {/* Red Clickable Missing Field Pill Tags */}
      <div className="mt-3 pt-3 border-t border-red-200 flex flex-wrap gap-2">
        {items.map((err, idx) => (
          <button
            key={`${err.id}-${idx}`}
            type="button"
            onClick={() => scrollToFormField(err.id)}
            className="inline-flex items-center gap-1.5 bg-red-50 hover:bg-red-100 border border-red-300 hover:border-red-600 text-red-800 px-2.5 py-1 text-xs font-semibold shadow-xs transition-all cursor-pointer group"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-red-600 group-hover:scale-125 transition-transform" />
            <span>{err.label}</span>
            <ArrowUpRight className="w-3 h-3 text-red-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </button>
        ))}
      </div>
    </div>
  );
}
