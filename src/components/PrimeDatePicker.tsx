"use client";

import React, { useId, useMemo, useRef } from "react";
import { Calendar } from "lucide-react";

export function toDateValue(value?: string) {
  if (!value) return "";
  const parts = value.includes("/") ? value.split("/") : value.split("-");
  if (parts.length !== 3) return "";
  const [a, b, c] = parts;
  return value.includes("/") ? `${c}-${a.padStart(2, "0")}-${b.padStart(2, "0")}` : value;
}

/**
 * Standardizes any date string (ISO YYYY-MM-DD or MM/DD/YYYY) into strict MM/DD/YYYY format.
 */
export function formatPrimeDate(value: string): string {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed) return "";

  // Already MM/DD/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    return trimmed;
  }

  const parts = trimmed.includes("-") ? trimmed.split("-") : trimmed.split("/");
  if (parts.length !== 3) return trimmed;

  if (trimmed.includes("-")) {
    const [y, m, d] = parts;
    return `${m.padStart(2, "0")}/${d.padStart(2, "0")}/${y}`;
  } else {
    const [m, d, y] = parts;
    return `${m.padStart(2, "0")}/${d.padStart(2, "0")}/${y}`;
  }
}

export const formatToMMDDYYYY = formatPrimeDate;

interface PrimeDatePickerProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
  hasError?: boolean;
  id?: string;
  disabled?: boolean;
}

export function PrimeDatePicker({
  value = "",
  onChange,
  placeholder = "MM/DD/YYYY",
  className = "",
  ariaLabel = "Date",
  hasError = false,
  id: customId,
  disabled = false,
}: PrimeDatePickerProps) {
  const generatedId = useId();
  const id = customId || generatedId;
  const nativePickerRef = useRef<HTMLInputElement | null>(null);

  const dateValue = useMemo(() => toDateValue(value), [value]);

  const handleCalendarClick = () => {
    try {
      if (nativePickerRef.current) {
        if (typeof nativePickerRef.current.showPicker === "function") {
          nativePickerRef.current.showPicker();
        } else {
          nativePickerRef.current.focus();
          nativePickerRef.current.click();
        }
      }
    } catch {
      nativePickerRef.current?.focus();
    }
  };

  return (
    <span className={`relative inline-flex items-center min-w-[118px] group ${className}`}>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        aria-label={ariaLabel}
        placeholder={placeholder}
        value={formatPrimeDate(value)}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className={`w-full border-b bg-transparent pr-6 text-xs px-1 focus:outline-none ${
          hasError ? "border-red-500 bg-red-50/50" : "border-[#0f172a] focus:border-[#003366]"
        }`}
      />
      <button
        type="button"
        title="Open Date Picker"
        aria-label={`Open ${ariaLabel} picker`}
        onClick={handleCalendarClick}
        disabled={disabled}
        className="absolute right-0 top-1/2 -translate-y-1/2 text-[#003366] hover:text-[#002244] p-0.5 cursor-pointer"
        tabIndex={-1}
      >
        <Calendar size={13} className="shrink-0" />
      </button>
      <input
        ref={nativePickerRef}
        type="date"
        aria-hidden="true"
        value={dateValue}
        onChange={(event) => onChange(formatPrimeDate(event.target.value))}
        disabled={disabled}
        className="sr-only"
        tabIndex={-1}
      />
    </span>
  );
}
