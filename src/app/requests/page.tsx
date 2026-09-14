"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Plus,
  Search,
  Building2,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Edit3,
  FileText,
} from "lucide-react";
import { TrackedRfp } from "../api/rfp/track/route";
import { DEPARTMENT_NAMES } from "@/types/rfp";

const DEPARTMENTS = ["All Departments", ...DEPARTMENT_NAMES];

const FORM_OPTIONS = [
  { key: "rfp", label: "Request for Payment", short: "RFP" },
  { key: "po", label: "Purchase Order", short: "PO" },
  { key: "pcv", label: "Petty Cash Voucher", short: "PCV" },
];

function RequestsContent() {
  const searchParams = useSearchParams();
  const initialId = searchParams.get("id") ?? "";

  const [searchQuery, setSearchQuery] = useState(initialId);
  const [selectedDept, setSelectedDept] = useState("All Departments");
  const [requests, setRequests] = useState<TrackedRfp[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showFormChooser, setShowFormChooser] = useState(false);

  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.append("query", searchQuery.trim());
      if (selectedDept !== "All Departments") params.append("dept", selectedDept);
      const res = await fetch(`/api/rfp/track?${params.toString()}`);
      const data = await res.json();
      if (res.ok && data.success) setRequests(data.requests ?? []);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, selectedDept]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const stageColor = (stage: string, revision: boolean) => {
    if (revision) return "border-amber-400";
    if (stage === "completed") return "border-emerald-400";
    return "border-slate-200";
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1
            className="font-serif italic font-bold text-2xl text-[#003366] tracking-tight"
            style={{ fontFamily: "var(--font-cormorant), 'Cormorant Garamond', Georgia, serif" }}
          >
            Requests
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">All submitted payment requests</p>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowFormChooser((v) => !v)}
            className="h-9 px-4 bg-[#003366] hover:bg-[#002244] text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Request
          </button>

          {showFormChooser && (
            <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 shadow-xl z-30 w-52">
              {FORM_OPTIONS.map((f) => (
                <Link
                  key={f.key}
                  href={`/?form=${f.key}`}
                  className="flex items-center gap-2.5 px-4 py-3 hover:bg-slate-50 text-xs font-semibold text-slate-800 border-b border-slate-100 last:border-0 transition-colors"
                  onClick={() => setShowFormChooser(false)}
                >
                  <span className="text-[10px] font-black px-1.5 py-0.5 bg-[#003366] text-[#C9A84C]">
                    {f.short}
                  </span>
                  {f.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 mb-6">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by task ID, payee, purpose…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-3 bg-white border border-slate-300 focus:border-[#003366] text-xs focus:outline-none transition-colors"
          />
        </div>
        <div className="relative">
          <Building2 className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="h-9 pl-9 pr-4 bg-white border border-slate-300 focus:border-[#003366] text-xs focus:outline-none cursor-pointer transition-colors"
          >
            {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
          </select>
        </div>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="bg-white border border-slate-200 p-12 text-center">
          <Loader2 className="w-6 h-6 animate-spin text-[#003366] mx-auto mb-2" />
          <p className="text-xs font-semibold text-slate-500">Loading requests…</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-white border border-slate-200 p-12 text-center">
          <FileText className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <h3 className="font-serif italic font-bold text-lg text-slate-700">No requests found</h3>
          <p className="text-xs text-slate-400 mt-1 mb-5">
            Try adjusting your search or submit a new request.
          </p>
          <button
            onClick={() => setShowFormChooser(true)}
            className="inline-flex items-center gap-1.5 h-8 px-4 text-xs font-bold text-white bg-[#003366] hover:bg-[#002244] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New Request
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => {
            const total = Number(req.totalAmount || 0).toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            });
            return (
              <div
                key={req.taskId}
                className={`bg-white border-l-4 ${stageColor(req.currentStage, req.isRevisionRequested)} border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-mono text-[10px] font-bold text-[#003366] bg-blue-50 px-1.5 py-0.5 border border-blue-100">
                      #{req.taskId}
                    </span>
                    {req.formType && (
                      <span className="text-[10px] font-black uppercase px-1.5 py-0.5 bg-[#003366] text-[#C9A84C]">
                        {req.formType.toUpperCase()}
                      </span>
                    )}
                    <span className="text-[10px] font-bold uppercase text-slate-500 bg-slate-100 px-1.5 py-0.5">
                      {req.department}
                    </span>
                    {req.isRevisionRequested && (
                      <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5">
                        <AlertTriangle className="w-3 h-3" /> Revision
                      </span>
                    )}
                    {req.currentStage === "completed" && (
                      <span className="flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5">
                        <CheckCircle2 className="w-3 h-3" /> Completed
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-bold text-slate-800 truncate">{req.payee}</p>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{req.purpose}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-bebas text-xl text-[#003366] tracking-wider">₱{total}</span>
                  {req.isRevisionRequested ? (
                    <Link
                      href={`/?taskId=${req.taskId}`}
                      className="h-8 px-3 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <Edit3 className="w-3 h-3" /> Edit
                    </Link>
                  ) : (
                    <Link
                      href={`/track?id=${req.taskId}`}
                      className="h-8 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      View
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function RequestsPage() {
  return (
    <Suspense fallback={<div className="max-w-5xl mx-auto px-4 py-12 text-center text-xs text-slate-500">Loading…</div>}>
      <RequestsContent />
    </Suspense>
  );
}
