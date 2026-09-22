"use client";

import React from "react";

export const NATURE_OF_TRANSACTION_OPTIONS = [
  { value: "Rent / Lease", description: "Rental or lease payments for office spaces, parking, equipment, or other leased assets." },
  { value: "Subscription", description: "Recurring or one-time payments for software, platforms, memberships, or other subscribed services." },
  { value: "Utility Payment", description: "Payments for electricity, water, internet, telephone, association dues, and other utility-related services." },
  { value: "Cash Advance", description: "Funds requested in advance for approved business-related expenses." },
  { value: "Reimbursement", description: "Reimbursement of approved business expenses personally paid by an employee." },
  { value: "Office Supply", description: "Purchase of office supplies, materials, and other office-related consumable items." },
  { value: "Petty Cash", description: "Petty cash replenishment and small-value business expenses paid through the petty cash fund." },
  { value: "Reimbursable Expense Allowances", description: "Approved employee expense allowances that are reimbursable under company policy." },
  { value: "Corporate Credit Card", description: "Corporate credit card payments, charges, and approved card-related expenses." },
  { value: "Business Permit", description: "Payments for business permits, licenses, registrations, and related government fees." },
  { value: "Event", description: "Expenses related to company events, activities, and engagements." },
  { value: "Vehicle Maintenance", description: "Maintenance, repair, and other approved expenses for company vehicles." },
  { value: "Manpower Services", description: "Payments for outsourced personnel, staffing, temporary workers, or other manpower-related services." },
  { value: "Government-Mandated Tax", description: "Payments for taxes and other mandatory government remittances." },
  { value: "Employee Government Tax", description: "Employee-related government tax payments and statutory remittances." },
] as const;

interface RequestClassificationProps {
  value?: string;
  onChange: (value: string) => void;
  hasError?: boolean;
}

export function RequestClassification({ value = "", onChange, hasError = false }: RequestClassificationProps) {
  const selected = NATURE_OF_TRANSACTION_OPTIONS.find((option) => option.value === value);

  return (
    <section id="request-classification-section" className={`mb-8 border bg-prime-white p-6 relative overflow-hidden ${hasError ? "border-2 border-red-600 ring-2 ring-red-200" : "border-prime-rule"}`} aria-labelledby="request-classification-heading">
      <div className={`absolute top-0 left-0 right-0 h-1 ${hasError ? "bg-red-600" : "bg-prime-gold"}`} />
      <div className="max-w-3xl">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-prime-blue">Portal-only reference</p>
        <h2 id="request-classification-heading" className="font-serif text-4xl text-prime-blue mt-1">Request Classification</h2>
        <p className="text-xs text-prime-ink mt-1">This classification is saved to ClickUp for reporting and routing. It is not added to the official RFP form or PDF.</p>

        <label htmlFor="nature-of-transaction" className="block mt-5 text-sm font-bold text-prime-ink">
          Nature of Transaction <span className="text-red-700" aria-hidden="true">*</span>
        </label>
        <select id="nature-of-transaction" name="natureOfTransaction" value={value} onChange={(event) => onChange(event.target.value)} aria-invalid={hasError} aria-describedby="nature-of-transaction-help nature-of-transaction-error" className="prime-field mt-2 w-full max-w-2xl">
          <option value="">Select a nature of transaction</option>
          {NATURE_OF_TRANSACTION_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.value}</option>)}
        </select>
        <p id="nature-of-transaction-help" className="mt-2 text-xs italic text-prime-ink/70">
          {selected?.description || "Choose the category that best describes this payment request."}
        </p>
        {hasError && <p id="nature-of-transaction-error" role="alert" className="mt-2 text-xs font-semibold text-red-700">Nature of Transaction is required before submitting.</p>}
      </div>
    </section>
  );
}
