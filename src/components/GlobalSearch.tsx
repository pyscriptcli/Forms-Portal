"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Command } from "lucide-react";

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
      router.push(`/track?id=${result.taskId}`);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setIsOpen(false);
      setQuery("");
    }
  }

  const stageLabel: Record<string, string> = {
    submitted: "Pending Approval",
    endorsed: "Endorsed",
    finance: "Finance",
    disbursement: "Disbursement",
    executive: "Exec Sign-Off",
    completed: "Completed",
    revision_requested: "Revision",
  };

  return (
    <div className="relative w-full max-w-md">
      <div className="relative flex items-center">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder="Search"
          aria-label="Global search"
          className="w-full h-8 pl-8 pr-12 bg-[#F8FAFC] hover:bg-white focus:bg-white border border-slate-200 focus:border-[#003366] text-slate-900 placeholder:text-slate-400 text-xs rounded-md shadow-2xs focus:outline-none transition-all"
        />
        {query ? (
          <button
            type="button"
            onClick={() => { setQuery(""); setResults([]); setIsOpen(false); }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
            aria-label="Clear search"
          >
            <X className="w-3 h-3" />
          </button>
        ) : (
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5 px-1 py-0.5 bg-slate-100 border border-slate-200 rounded text-[9px] font-mono text-slate-400 pointer-events-none">
            <Command className="w-2.5 h-2.5" />
            <span>K</span>
          </div>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div
          ref={dropdownRef}
          role="listbox"
          aria-label="Search results"
          className="absolute top-full mt-1.5 w-full bg-white border border-slate-200 shadow-xl z-50 rounded-md overflow-hidden text-left"
        >
          {results.map((r) => (
            <button
              key={r.taskId}
              role="option"
              type="button"
              onClick={() => handleSelect(r)}
              className="w-full text-left px-3.5 py-2.5 hover:bg-slate-50 flex items-center justify-between gap-2 border-b border-slate-100 last:border-0 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono text-[10px] font-bold text-[#003366] bg-blue-50 px-1.5 py-0.5 border border-blue-100 shrink-0">
                  #{r.taskId}
                </span>
                <span className="text-xs font-semibold text-slate-800 truncate">
                  {r.payee}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {r.formType && (
                  <span className="text-[10px] font-black uppercase px-1.5 py-0.5 bg-[#003366] text-[#C9A84C]">
                    {r.formType.toUpperCase()}
                  </span>
                )}
                {r.currentStage && (
                  <span className="text-[10px] text-slate-500 font-medium">
                    {stageLabel[r.currentStage] ?? r.currentStage}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {isOpen && isLoading && (
        <div className="absolute top-full mt-1.5 w-full bg-white border border-slate-200 shadow-xl z-50 rounded-md px-3.5 py-2 text-xs text-slate-400">
          Searching…
        </div>
      )}
    </div>
  );
}
