"use client";

import React, { useEffect, useRef, useState } from "react";
import { BadgePercent, CalendarDays, Car, Check, ChevronDown, CircleDollarSign, CreditCard, FileCheck, Home, Landmark, Package, Receipt, RefreshCw, RotateCcw, Users, Wallet, Zap, type LucideIcon } from "lucide-react";

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

const OPTION_ICONS: Record<string, LucideIcon> = {
  "Rent / Lease": Home,
  Subscription: RefreshCw,
  "Utility Payment": Zap,
  "Cash Advance": Wallet,
  Reimbursement: RotateCcw,
  "Office Supply": Package,
  "Petty Cash": CircleDollarSign,
  "Reimbursable Expense Allowances": BadgePercent,
  "Corporate Credit Card": CreditCard,
  "Business Permit": FileCheck,
  Event: CalendarDays,
  "Vehicle Maintenance": Car,
  "Manpower Services": Users,
  "Government-Mandated Tax": Landmark,
  "Employee Government Tax": Receipt,
};

interface RequestClassificationProps {
  value?: string;
  onChange: (value: string) => void;
  hasError?: boolean;
  compact?: boolean;
}

export function RequestClassification({ value = "", onChange, hasError = false, compact = false }: RequestClassificationProps) {
  const selected = NATURE_OF_TRANSACTION_OPTIONS.find((option) => option.value === value);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  return (
    <section id="request-classification-section" className={`${compact ? "relative min-w-0 flex-1 sm:max-w-[300px]" : "relative mx-auto mb-8 w-full max-w-[850px] border bg-prime-white px-3 py-2.5"} overflow-visible ${!compact && (hasError ? "border-2 border-red-600 ring-2 ring-red-200" : "border-prime-rule")}`} aria-labelledby="request-classification-heading">
      {!compact && <div className={`absolute top-0 left-0 right-0 h-1 ${hasError ? "bg-red-600" : "bg-prime-gold"}`} />}
      <div className="flex flex-col gap-1.5">
        <div ref={containerRef} className="relative min-w-0 flex-1">
          <h2 id="request-classification-heading" className={compact ? "sr-only" : "mb-1 text-xs font-bold uppercase tracking-[0.12em] text-prime-blue"}>Nature of Transaction <span className="text-red-700" aria-hidden="true">*</span></h2>
          <label htmlFor="nature-of-transaction" className="sr-only">Nature of Transaction</label>
          <input id="nature-of-transaction" name="natureOfTransaction" type="hidden" value={value} required aria-invalid={hasError} />
          <button type="button" aria-labelledby="request-classification-heading" aria-haspopup="listbox" aria-expanded={isOpen} aria-controls="nature-of-transaction-options" onClick={() => setIsOpen((open) => !open)} className={compact ? `prime-button secondary flex w-full items-center justify-between gap-2 whitespace-nowrap text-left ${hasError ? "border-red-600" : ""}` : `prime-field flex w-full items-center justify-between gap-3 text-left py-2 ${hasError ? "border-red-600" : ""}`}>
            {compact ? <span className="flex min-w-0 items-center gap-2"><span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.08em]">Nature:</span>{(() => { const Icon = selected ? OPTION_ICONS[selected.value] || Receipt : Receipt; return <Icon className="h-4 w-4 shrink-0" strokeWidth={1.7} aria-hidden="true" />; })()}<span className="truncate text-xs font-semibold">{selected?.value || "Select category"}<span className="text-red-700" aria-hidden="true"> *</span></span></span> : <span className="min-w-0"><span className="block truncate text-sm font-semibold">{selected?.value || "Select a category"}</span><span className="block truncate text-[11px] italic text-prime-ink/65">{selected?.description || "Choose a category"}</span></span>}
            <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
          </button>
          {isOpen && (
            <div id="nature-of-transaction-options" role="listbox" aria-label="Nature of Transaction options" className={`absolute z-30 grid max-h-[min(70vh,31rem)] w-full grid-cols-1 overflow-y-auto border border-prime-blue bg-prime-white p-1 shadow-lg ${compact ? "bottom-full mb-1" : "mt-1"}`}>
              {NATURE_OF_TRANSACTION_OPTIONS.map((option) => (
                <button key={option.value} type="button" role="option" aria-selected={value === option.value} onClick={() => { onChange(option.value); setIsOpen(false); }} className={`border-b border-prime-rule/60 px-2.5 py-1.5 text-left last:border-0 hover:bg-prime-gold/10 sm:border-r ${value === option.value ? "bg-prime-gold/15 ring-1 ring-inset ring-prime-gold" : ""}`}>
                  <span className="flex items-start gap-2">
                    {(() => { const Icon = OPTION_ICONS[option.value] || Receipt; return <Icon className="mt-0.5 h-4 w-4 shrink-0 text-prime-blue" strokeWidth={1.7} aria-hidden="true" />; })()}
                    <span>
                      <span className="flex items-center gap-1 text-xs font-semibold text-prime-blue">{option.value}{value === option.value && <Check className="h-3.5 w-3.5 text-prime-gold" aria-label="Selected" />}</span>
                      <span className="mt-0.5 block text-[10px] italic leading-snug text-prime-ink/70">{option.description}</span>
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
          {hasError && <p id="nature-of-transaction-error" role="alert" className="mt-1 text-xs font-semibold text-red-700">Nature of Transaction is required.</p>}
        </div>
      </div>
    </section>
  );
}
