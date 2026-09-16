"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";

interface SearchResult {
  taskId: string;
  payee: string;
  formType?: string;
  currentStage?: string;
  department?: string;
}

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(
          `/api/rfp/track?query=${encodeURIComponent(query.trim())}`
        );
        const data = await res.json();
        if (res.ok && data.success) {
          setResults((data.requests || []).slice(0, 6));
          setIsOpen(true);
        }
      } catch {
        // silently fail — search is best-effort
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // Close on click-outside
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function handleSelect(result: SearchResult) {
    setIsOpen(false);
    setQuery("");
    const isApproval =
      result.currentStage === "submitted" ||
      result.currentStage === "revision_requested";
    if (isApproval) {
      router.push(`/approvals?taskId=${result.taskId}`);
    } else {
      router.push(`/requests?id=${result.taskId}`);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setIsOpen(false);
      setQuery("");
    }
  }

  const stageLabel: Record<string, string> = {
    submitted: "Submission",
    endorsed: "TL Approval",
    finance_verification: "Finance",
    disbursement_prep: "Payment",
    executive_signoff: "Management Approval",
    completed: "Completed",
    revision_requested: "Revision",
  };

  return (
    <div className="relative w-full max-w-sm">
      <div className="relative flex items-center">
        <Search className="w-3.5 h-3.5 text-prime-ink absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder="Search"
          aria-label="Global search"
          className="w-full h-8 pl-8 pr-11 bg-prime-white hover:bg-prime-white focus:bg-prime-white border border-prime-rule focus:border-prime-blue text-prime-ink placeholder:text-prime-ink text-xs rounded-none shadow-none focus:outline-none transition-all"
        />
        {query ? (
          <button
            type="button"
            onClick={() => { setQuery(""); setResults([]); setIsOpen(false); }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-prime-ink hover:text-prime-blue"
            aria-label="Clear search"
          >
            <X className="w-3 h-3" />
          </button>
        ) : null}
      </div>

      {isOpen && results.length > 0 && (
        <div
          ref={dropdownRef}
          role="region"
          aria-label="Search results"
          className="absolute right-0 top-full mt-1.5 w-[min(620px,calc(100vw-32px))] bg-prime-white border border-prime-blue z-50 text-left"
        >
          {results.map((r) => (
            <button
              key={r.taskId}
              type="button"
              onClick={() => handleSelect(r)}
              className="w-full text-left px-3.5 py-2.5 hover:underline flex flex-wrap items-center justify-between gap-2 border-b border-prime-rule last:border-0 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-sans tabular-nums text-[11px] font-medium text-prime-blue bg-prime-white px-1.5 py-0.5 border border-prime-rule shrink-0">
                  #{r.taskId}
                </span>
                <span className="text-xs font-medium text-prime-ink truncate">
                  {r.payee}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {r.formType && (
                  <span className="text-[11px] font-medium uppercase px-1.5 py-0.5 bg-prime-blue text-prime-white">
                    {r.formType.toUpperCase()}
                  </span>
                )}
                {r.currentStage && (
                  <span className="text-[11px] text-prime-ink font-medium">
                    {stageLabel[r.currentStage] ?? r.currentStage}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {isOpen && isLoading && (
        <div className="absolute top-full mt-1.5 w-full bg-prime-white border border-prime-rule shadow-none z-50 rounded-none px-3.5 py-2 text-xs text-prime-ink">
          Searching…
        </div>
      )}
    </div>
  );
}
