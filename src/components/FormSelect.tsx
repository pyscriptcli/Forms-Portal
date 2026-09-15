"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Receipt, FileSpreadsheet, Banknote } from "lucide-react";

export type FormOption = {
  value: string;
  label: string;
  description?: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
};

const FORM_OPTIONS: FormOption[] = [
  {
    value: "rfp",
    label: "Request for Payment",
    description: "Standard reimbursement or supplier invoice payment",
    icon: Receipt,
  },
  {
    value: "po",
    label: "Purchase Order",
    description: "Official commercial document for ordered goods/services",
    icon: FileSpreadsheet,
  },
  {
    value: "pcv",
    label: "Petty Cash Voucher",
    description: "Small immediate business expense disbursements",
    icon: Banknote,
  },
];

interface FormSelectProps {
  value: string;
  onChange: (value: "rfp" | "po" | "pcv") => void;
  className?: string;
  id?: string;
}

export function FormSelect({
  value,
  onChange,
  className = "",
  id = "active-form-selector",
}: FormSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const currentOption =
    FORM_OPTIONS.find((opt) => opt.value === value) || FORM_OPTIONS[0];
  const CurrentIcon = currentOption.icon;

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard accessibility
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false);
      triggerRef.current?.focus();
    } else if (e.key === "ArrowDown" && !isOpen) {
      e.preventDefault();
      setIsOpen(true);
    } else if (e.key === "ArrowDown" && isOpen) {
      e.preventDefault();
      const currentIndex = FORM_OPTIONS.findIndex((opt) => opt.value === value);
      const nextIndex = (currentIndex + 1) % FORM_OPTIONS.length;
      onChange(FORM_OPTIONS[nextIndex].value as "rfp" | "po" | "pcv");
    } else if (e.key === "ArrowUp" && isOpen) {
      e.preventDefault();
      const currentIndex = FORM_OPTIONS.findIndex((opt) => opt.value === value);
      const prevIndex = (currentIndex - 1 + FORM_OPTIONS.length) % FORM_OPTIONS.length;
      onChange(FORM_OPTIONS[prevIndex].value as "rfp" | "po" | "pcv");
    } else if (e.key === "Enter" || e.key === " ") {
      if (!isOpen) {
        e.preventDefault();
        setIsOpen(true);
      }
    }
  };

  return (
    <div ref={dropdownRef} className={`relative inline-block text-left ${className}`}>
      {/* Trigger Button */}
      <button
        id={id}
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Form type selector: ${currentOption.label}`}
        className="group min-h-11 h-11 px-3.5 bg-prime-white border border-prime-rule hover:border-prime-gold focus:border-prime-gold focus:outline-none flex items-center justify-between gap-3 text-xs font-medium text-prime-blue transition-all cursor-pointer shadow-sm hover:shadow"
      >
        <div className="flex items-center gap-2.5">
          <CurrentIcon
            size={16}
            className="text-prime-blue group-hover:text-prime-gold transition-colors shrink-0"
          />
          <span className="font-semibold text-prime-blue tracking-wide">
            {currentOption.label}
          </span>
        </div>
        <ChevronDown
          size={14}
          className={`text-prime-ink/70 group-hover:text-prime-gold transition-transform duration-200 shrink-0 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Popover Dropdown Menu */}
      {isOpen && (
        <div
          role="listbox"
          aria-label="Available form types"
          className="absolute right-0 top-full mt-1.5 w-72 bg-prime-white border border-prime-blue/30 shadow-xl z-50 py-1 divide-y divide-prime-rule/60 animate-in fade-in zoom-in-95 duration-150"
        >
          {FORM_OPTIONS.map((option) => {
            const isSelected = option.value === value;
            const Icon = option.icon;

            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(option.value as "rfp" | "po" | "pcv");
                  setIsOpen(false);
                  triggerRef.current?.focus();
                }}
                className={`w-full text-left px-3.5 py-2.5 flex items-start gap-3 transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-[#0B3C68]/10 text-prime-blue border-l-2 border-prime-gold"
                    : "hover:bg-prime-warm-white text-prime-ink border-l-2 border-transparent"
                }`}
              >
                <Icon
                  size={16}
                  className={`mt-0.5 shrink-0 ${
                    isSelected ? "text-prime-gold" : "text-prime-ink/70"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-xs ${
                        isSelected ? "font-bold text-prime-blue" : "font-medium"
                      }`}
                    >
                      {option.label}
                    </span>
                    {isSelected && (
                      <Check size={14} className="text-prime-gold shrink-0" />
                    )}
                  </div>
                  {option.description && (
                    <p className="text-[11px] text-prime-ink/60 mt-0.5 leading-snug">
                      {option.description}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
