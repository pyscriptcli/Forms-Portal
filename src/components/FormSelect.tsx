"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Check, ChevronDown, Receipt, Search } from "lucide-react";

export type FormOption = {
  value: "rfp" | "rfb" | "credit-sharing" | "gw-rfp" | "gw-rfb" | "gw-credit-sharing" | "travel-budget";
  label: string;
  description: string;
  logo?: string;
  folder: "PRIME" | "Greatwork" | "Travel Budget";
};

const FORM_GROUPS = [
  { key: "PRIME", label: "PRIME", description: "Payment, billing, and credit-sharing requests." },
  { key: "Greatwork", label: "GreatWork", description: "GreatWork payment, billing, and credit-sharing requests." },
  { key: "Travel Budget", label: "Travel Budget", description: "Employee travel planning, budget, and approvals." },
] as const;

const FORM_OPTIONS: FormOption[] = [
  { value: "rfp", label: "PRIME - REQUEST FOR PAYMENT (RFP)", description: "Vendor reimbursement and disbursement requests.", logo: "/prime-icon.png", folder: "PRIME" },
  { value: "rfb", label: "PRIME - REQUEST FOR BILLING (RFB)", description: "Billing requests for leasing services.", logo: "/prime-icon.png", folder: "PRIME" },
  { value: "credit-sharing", label: "PRIME - CREDIT SHARING FORM", description: "Submit PRIME credit-sharing details.", logo: "/prime-icon.png", folder: "PRIME" },
  { value: "gw-rfp", label: "GREATWORK - REQUEST FOR PAYMENT (RFP)", description: "GreatWork payment request using the revised template.", logo: "/greatwork-logo.png", folder: "Greatwork" },
  { value: "gw-rfb", label: "GREATWORK - REQUEST FOR BILLING (RFB)", description: "Billing requests for My GreatWork Spaces.", logo: "/greatwork-logo.png", folder: "Greatwork" },
  { value: "gw-credit-sharing", label: "GREATWORK - CREDIT SHARING FORM", description: "GreatWork credit-sharing and referral details.", logo: "/greatwork-logo.png", folder: "Greatwork" },
  { value: "travel-budget", label: "TRAVEL BUDGET - REQUEST FORM", description: "Employee travel planning, budget, and approval.", folder: "Travel Budget" },
];

interface FormSelectProps {
  value: string;
  onChange: (value: FormOption["value"]) => void;
  className?: string;
  id?: string;
}

export function FormSelect({ value, onChange, className = "", id = "active-form-selector" }: FormSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeGroup, setActiveGroup] = useState<FormOption["folder"]>("PRIME");
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const currentOption = FORM_OPTIONS.find((option) => option.value === value) ?? FORM_OPTIONS[0];
  const normalizedSearch = searchTerm.trim().toLowerCase();

  const visibleOptions = useMemo(
    () => FORM_OPTIONS.filter((option) => {
      const matchesGroup = normalizedSearch ? true : option.folder === activeGroup;
      const matchesSearch = !normalizedSearch || `${option.label} ${option.description}`.toLowerCase().includes(normalizedSearch);
      return matchesGroup && matchesSearch;
    }),
    [activeGroup, normalizedSearch],
  );

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: PointerEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const chooseForm = (nextValue: FormOption["value"]) => {
    onChange(nextValue);
    setIsOpen(false);
    setSearchTerm("");
    triggerRef.current?.focus();
  };

  return (
    <div ref={dropdownRef} className={`prime-form-picker ${className}`}>
      <button
        id={id}
        ref={triggerRef}
        type="button"
        className="prime-form-picker-trigger"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls="form-picker-panel"
        aria-label={`Choose a form: ${currentOption.label}`}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className="prime-form-picker-trigger-copy">
          <span className="prime-form-picker-eyebrow">Current form</span>
          <span className="prime-form-picker-value flex items-center gap-2">
            {currentOption.logo && <Image src={currentOption.logo} alt="" width={18} height={18} unoptimized className="h-[18px] w-[18px] object-contain" />}
            {currentOption.label}
          </span>
        </span>
        <ChevronDown size={16} aria-hidden="true" className={isOpen ? "rotate-180" : ""} />
      </button>

      {isOpen && (
        <div id="form-picker-panel" className="prime-form-picker-panel" role="dialog" aria-label="Choose a form">
          <div className="prime-form-picker-panel-header">
            <div>
              <p className="prime-label">New request</p>
              <h2>Choose a form</h2>
              <p>Start with the request that matches what you need to submit.</p>
            </div>
            <div className="prime-form-picker-search">
              <Search size={15} aria-hidden="true" />
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search forms"
                aria-label="Search forms"
              />
            </div>
          </div>

          <div className="prime-form-picker-body">
            <nav className="prime-form-picker-groups" aria-label="Form categories">
              {FORM_GROUPS.map((group) => {
                const isActive = activeGroup === group.key;
                const count = FORM_OPTIONS.filter((option) => option.folder === group.key).length;
                return (
                  <button
                    key={group.key}
                    type="button"
                    className={`prime-form-picker-group${isActive ? " is-active" : ""}`}
                    aria-pressed={isActive}
                    onClick={() => {
                      setActiveGroup(group.key);
                      setSearchTerm("");
                    }}
                  >
                    <span>{group.label}</span>
                    <span className="prime-form-picker-count">{count}</span>
                  </button>
                );
              })}
            </nav>

            <div className="prime-form-picker-options">
              <div className="prime-form-picker-section-heading">
                <p className="prime-label">{normalizedSearch ? "Search results" : FORM_GROUPS.find((group) => group.key === activeGroup)?.label}</p>
                <p>
                  {normalizedSearch
                    ? `Showing forms that match “${searchTerm.trim()}”.`
                    : FORM_GROUPS.find((group) => group.key === activeGroup)?.description}
                </p>
              </div>
              {visibleOptions.length > 0 ? visibleOptions.map((option) => {
                const isSelected = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    className={`prime-form-option${isSelected ? " is-selected" : ""}`}
                    aria-current={isSelected ? "true" : undefined}
                    onClick={() => chooseForm(option.value)}
                  >
                    <span className="prime-form-option-icon">
                      {option.logo ? <Image src={option.logo} alt="" width={17} height={17} unoptimized className="h-[17px] w-[17px] object-contain" /> : <Receipt size={17} aria-hidden="true" />}
                    </span>
                    <span className="prime-form-option-copy">
                      <span className="prime-form-option-title">{option.label}</span>
                      <span className="prime-form-option-description">{option.description}</span>
                    </span>
                    {isSelected && <Check size={16} aria-label="Selected" className="prime-form-option-check" />}
                  </button>
                );
              }) : <p className="prime-form-picker-empty">No forms match “{searchTerm}”.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
