"use client";

import React from "react";
import { Check } from "lucide-react";

interface PrimeCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: React.ReactNode;
  id?: string;
  disabled?: boolean;
  className?: string;
}

export function PrimeCheckbox({
  checked,
  onChange,
  label,
  id,
  disabled = false,
  className = "",
}: PrimeCheckboxProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!disabled) {
      onChange(!checked);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      onChange(!checked);
    }
  };

  return (
    <label
      htmlFor={id}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={disabled ? -1 : 0}
      role="checkbox"
      aria-checked={checked}
      className={`inline-flex items-center gap-2 select-none cursor-pointer group focus:outline-none ${
        disabled ? "opacity-50 cursor-not-allowed" : ""
      } ${className}`}
    >
      <span
        className={`w-3.5 h-3.5 shrink-0 flex items-center justify-center border transition-all duration-150 ${
          checked
            ? "bg-[#003366] border-[#003366] text-white"
            : "bg-white border-[#003366] hover:border-[#002244] group-focus:ring-2 group-focus:ring-[#003366]/20"
        }`}
      >
        {checked && <Check size={11} strokeWidth={3.5} className="text-white" />}
      </span>
      {label && (
        <span className="text-xs text-[#0f172a] font-normal leading-tight">
          {label}
        </span>
      )}
    </label>
  );
}
