"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { DEPARTMENT_PRESETS } from "@/types/rfp";

interface DepartmentComboboxProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  hasError?: boolean;
}

export function DepartmentCombobox({
  id = "field-department",
  value,
  onChange,
  placeholder = "ex. Brokerage",
  className = "",
  hasError = false,
}: DepartmentComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (presetCode: string) => {
    onChange(presetCode);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  // Filter presets based on user input (or show all if value matches exactly or is empty)
  const trimmedVal = (value || "").trim().toLowerCase();
  const filteredPresets = DEPARTMENT_PRESETS.filter(
    (p) =>
      !trimmedVal ||
      p.code.toLowerCase().includes(trimmedVal) ||
      p.name.toLowerCase().includes(trimmedVal)
  );

  const exactMatch = DEPARTMENT_PRESETS.find(
    (p) => p.code.toLowerCase() === trimmedVal
  );

  return (
    <div ref={containerRef} className="relative w-full inline-block">
      <div className="relative flex items-center w-full">
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setIsOpen(false);
          }}
          placeholder={placeholder}
          autoComplete="off"
          className={`${className} pr-6`}
        />

        {/* Dropdown toggle chevron */}
        <button
          type="button"
          tabIndex={-1}
          data-html2canvas-ignore="true"
          onClick={() => setIsOpen((prev) => !prev)}
          className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 text-prime-ink hover:text-prime-ink cursor-pointer no-print focus:outline-none"
          title="Toggle department presets"
        >
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-150 ${
              isOpen ? "rotate-180 text-prime-blue" : ""
            }`}
          />
        </button>
      </div>

      {/* Floating Presets Dropdown */}
      {isOpen && (
        <div
          data-html2canvas-ignore="true"
          className="absolute left-0 top-full mt-1 w-60 max-h-64 overflow-y-auto bg-prime-white border border-prime-rule shadow-none z-50 p-1.5 no-print rounded-none animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="px-2 py-1 text-[11px] font-medium uppercase tracking-wider text-prime-ink border-b border-prime-rule flex items-center justify-between">
            <span>ClickUp Presets</span>
            <span className="font-normal text-prime-ink italic">or type custom</span>
          </div>

          <div className="py-1 space-y-0.5">
            {filteredPresets.map((preset) => {
              const isSelected = value?.trim().toLowerCase() === preset.code.toLowerCase();
              return (
                <button
                  key={preset.code}
                  type="button"
                  onClick={() => handleSelect(preset.code)}
                  className={`w-full flex items-center justify-between px-2 py-1.5 text-left text-xs cursor-pointer transition-colors ${
                    isSelected ? "bg-prime-white font-medium" : "hover:bg-prime-white"
                  }`}
                >
                  <span
                    className="inline-block bg-prime-white text-prime-blue border border-prime-rule px-2.5 py-0.5 text-[11px] font-medium tracking-wide rounded-none shadow-none"

                  >
                    {preset.name}
                  </span>

                  {isSelected && <Check className="w-3.5 h-3.5 text-prime-blue" />}
                </button>
              );
            })}

            {filteredPresets.length === 0 && (
              <div className="px-2 py-2 text-xs text-prime-ink italic">
                No preset matching &quot;{value}&quot;.
              </div>
            )}
          </div>

          {/* Custom value indicator if typed value isn't a preset */}
          {value?.trim() && !exactMatch && (
            <div className="mt-1 pt-1 border-t border-prime-rule px-2 py-1 bg-prime-white text-[11px] text-prime-blue flex items-center justify-between">
              <span>Using custom: <strong>&quot;{value}&quot;</strong></span>
              <span className="text-[11px] text-prime-blue font-medium">(Custom)</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
