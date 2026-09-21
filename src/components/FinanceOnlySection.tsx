"use client";

import React from "react";

export function FinanceOnlySection({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`finance-only-section ${className}`}>
      <fieldset disabled className="finance-only-content">
        {children}
      </fieldset>
      <div className="finance-only-overlay no-print" data-pdf-ignore="true" aria-hidden="true">
        <span>Finance / Accounting Only</span>
      </div>
    </div>
  );
}
