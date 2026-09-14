"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
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
    if (revision) return "border-prime-rule";
    if (stage === "completed") return "border-prime-rule";
    return "border-prime-rule";
  };

  return (
    <div className="prime-page">
      <PageHeader title="Requests" description="Review submitted forms and follow their progress." actions={
        <div className="relative">
          <button type="button" className="prime-button" onClick={() => setShowFormChooser(v => !v)} aria-expanded={showFormChooser}>
            <Plus size={16} /> New request
          </button>
          {showFormChooser && (
            <div className="absolute right-0 top-full mt-2 bg-prime-white border border-prime-blue z-30 w-64">
              {FORM_OPTIONS.map(f => (
                <Link key={f.key} href={`/?form=${f.key}`} className="flex items-center gap-3 px-4 py-4 text-sm text-prime-blue border-b border-prime-rule last:border-0 hover:underline" onClick={() => setShowFormChooser(false)}>
                  <FileText size={16} /> {f.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      } />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 mb-6">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-prime-ink absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            aria-label="Search requests"
            placeholder="Search by task ID, payee, purpose…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full min-h-11 pl-9 pr-3 bg-prime-white border border-prime-rule focus:border-prime-blue text-xs focus:outline-none transition-colors"
          />
        </div>
        <div className="relative">
          <Building2 className="w-3.5 h-3.5 text-prime-ink absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <select
            aria-label="Filter requests by department"
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="min-h-11 pl-9 pr-4 bg-prime-white border border-prime-rule focus:border-prime-blue text-xs focus:outline-none cursor-pointer transition-colors"
          >
            {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
          </select>
        </div>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="bg-prime-white border border-prime-rule p-12 text-center">
          <Loader2 className="w-6 h-6 animate-spin text-prime-blue mx-auto mb-2" />
          <p className="text-xs font-medium text-prime-ink">Loading requests…</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-prime-white border border-prime-rule p-12 text-center">
          <FileText className="w-8 h-8 text-prime-ink mx-auto mb-3" />
          <h3 className="font-serif italic font-medium text-lg text-prime-ink">No requests found</h3>
          <p className="text-xs text-prime-ink mt-1 mb-5">
            Try adjusting your search or submit a new request.
          </p>
          <button
            onClick={() => setShowFormChooser(true)}
            className="inline-flex items-center gap-1.5 h-8 px-4 text-xs font-medium text-prime-white bg-prime-blue hover:bg-prime-blue transition-colors"
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
                className={`bg-prime-white border-l-4 ${stageColor(req.currentStage, req.isRevisionRequested)} border border-prime-rule p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-none`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-sans tabular-nums text-[11px] font-medium text-prime-blue bg-prime-white px-1.5 py-0.5 border border-prime-rule">
                      #{req.taskId}
                    </span>
                    {req.formType && (
                      <span className="text-[11px] font-medium uppercase px-1.5 py-0.5 bg-prime-blue text-prime-white">
                        {req.formType.toUpperCase()}
                      </span>
                    )}
                    <span className="text-[11px] font-medium uppercase text-prime-ink bg-prime-white px-1.5 py-0.5">
                      {req.department}
                    </span>
                    {req.isRevisionRequested && (
                      <span className="flex items-center gap-0.5 text-[11px] font-medium text-prime-blue bg-prime-white border border-prime-rule px-1.5 py-0.5">
                        <AlertTriangle className="w-3 h-3" /> Revision
                      </span>
                    )}
                    {req.currentStage === "completed" && (
                      <span className="flex items-center gap-0.5 text-[11px] font-medium text-prime-blue bg-prime-white border border-prime-rule px-1.5 py-0.5">
                        <CheckCircle2 className="w-3 h-3" /> Completed
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-prime-ink truncate">{req.payee}</p>
                  <p className="text-xs text-prime-ink mt-0.5 line-clamp-1">{req.purpose}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-bebas text-xl text-prime-blue tracking-wider">₱{total}</span>
                  {req.isRevisionRequested ? (
                    <Link
                      href={`/?taskId=${req.taskId}`}
                      className="h-8 px-3 bg-prime-blue hover:bg-prime-blue text-prime-white text-xs font-medium flex items-center gap-1.5 transition-colors"
                    >
                      <Edit3 className="w-3 h-3" /> Edit
                    </Link>
                  ) : (
                    <Link
                      href={`/track?id=${req.taskId}`}
                      className="h-8 px-3 bg-prime-white hover:bg-prime-white text-prime-ink text-xs font-medium flex items-center gap-1.5 transition-colors"
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
    <Suspense fallback={<div className="max-w-5xl mx-auto px-4 py-12 text-center text-xs text-prime-ink">Loading…</div>}>
      <RequestsContent />
    </Suspense>
  );
}
