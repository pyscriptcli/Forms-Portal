"use client";

import React from "react";

interface FinanceOnlySectionProps {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  showOverlay?: boolean;
  overlayLabel?: string;
  overlayAriaLabel?: string;
}

export function FinanceOnlySection({
  children,
  className = "",
  disabled = true,
  showOverlay = true,
  overlayLabel = "Finance / Accounting Only",
  overlayAriaLabel,
}: FinanceOnlySectionProps) {
  return (
    <div className={`finance-only-section ${className}`}>
      <fieldset disabled={disabled} className="finance-only-content">
        {children}
      </fieldset>
      {showOverlay && (
        <div
          className="finance-only-overlay no-print"
          data-pdf-ignore="true"
          role={overlayAriaLabel ? "note" : undefined}
          aria-label={overlayAriaLabel}
          aria-hidden={overlayAriaLabel ? undefined : true}
        >
          <span>{overlayLabel}</span>
        </div>
      )}
    </div>
  );
}
