"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { useSearchParams } from "next/navigation";
import {
  Search,
  Building2,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Edit3,
  FileText,
  RefreshCw,
  ExternalLink,
  X,
  Clock3,
  Check,
} from "lucide-react";
import { TrackedRfp } from "../api/rfp/track/route";
import { DEPARTMENT_NAMES } from "@/types/rfp";

const DEPARTMENTS = ["All Departments", ...DEPARTMENT_NAMES];

const WORKFLOW_STAGES = [
  { label: "Submission", milestones: ["Requestor form submission"] },
  { label: "TL Approval", milestones: ["TL Review and Approval"] },
  { label: "Finance", milestones: ["Validation", "Processing", "Payment Preparation"] },
  { label: "Management Approval", milestones: ["CFO/CEO review and sign-off"] },
  { label: "Payment", milestones: ["Payment Release", "Payment Documentation"] },
  { label: "Completed", milestones: ["Records Filing"] },
];

function RequestTimeline({ request }: { request: TrackedRfp }) {
  const activeIndex = Math.max(0, Math.min(request.stageIndex, WORKFLOW_STAGES.length - 1));

  return (
    <div className="border-b border-prime-rule bg-prime-white px-4 py-6 sm:px-7">
      <div className="grid grid-cols-2 gap-y-7 sm:grid-cols-6 sm:gap-0">
        {WORKFLOW_STAGES.map((stage, index) => {
          const complete = index < activeIndex;
          const active = index === activeIndex;
          return (
            <div key={stage.label} className="relative flex flex-col items-center text-center px-2">
              {index < WORKFLOW_STAGES.length - 1 && (
                <span className={`hidden sm:block absolute left-1/2 right-[-50%] top-4 h-px ${complete ? "bg-prime-blue" : "bg-prime-rule"}`} aria-hidden="true" />
              )}
              <span className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold ${active ? "border-prime-gold bg-prime-gold text-prime-blue" : complete ? "border-prime-blue bg-prime-blue text-prime-white" : "border-prime-rule bg-prime-white text-prime-ink"}`}>
                {complete ? <Check size={14} /> : active ? <Clock3 size={15} /> : index + 1}
              </span>
              <p className={`relative z-10 mt-2 text-xs font-semibold ${active ? "text-prime-blue" : "text-prime-ink"}`}>{stage.label}</p>
              <div className="relative z-10 mt-0.5 max-w-[160px] text-[10px] leading-tight text-prime-ink/70">
                {active && request.isRevisionRequested ? <p>Revision requested</p> : stage.milestones.map((milestone) => (
                  <p key={milestone}>{milestone}</p>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RequestsContent() {
  const searchParams = useSearchParams();
  const initialId = searchParams.get("id") ?? "";

  const [searchQuery, setSearchQuery] = useState(initialId);
  const [selectedDept, setSelectedDept] = useState("All Departments");
  const [requests, setRequests] = useState<TrackedRfp[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<TrackedRfp | null>(null);
  const [viewerCanViewAll, setViewerCanViewAll] = useState(false);

  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.append("query", searchQuery.trim());
      if (selectedDept !== "All Departments") params.append("dept", selectedDept);
      const res = await fetch(`/api/rfp/track?${params.toString()}`);
      const data = await res.json();
      if (res.ok && data.success) {
        const nextRequests = data.requests ?? [];
        setRequests(nextRequests);
        setViewerCanViewAll(Boolean(data.viewerCanViewAll));
        if (initialId) {
          setSelectedRequest(nextRequests.find((request: TrackedRfp) => request.taskId === initialId) ?? null);
        }
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, selectedDept, initialId]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const openRequest = (request: TrackedRfp) => {
    setSelectedRequest(request);
    setSearchQuery(request.taskId);
    window.history.pushState({}, "", `/requests?id=${encodeURIComponent(request.taskId)}`);
  };

  const closeRequest = () => {
    setSelectedRequest(null);
    setSearchQuery("");
    window.history.pushState({}, "", "/requests");
    void fetchRequests();
  };

  const stageColor = (stage: string, revision: boolean) => {
    if (revision) return "border-prime-rule";
    if (stage === "completed") return "border-prime-rule";
    return "border-prime-rule";
  };

  return (
    <div className="prime-page">
      <PageHeader
        title="Requests"
        description="Review submitted forms and follow their progress."
        actions={
          <button
            type="button"
            className="prime-button secondary"
            onClick={() => fetchRequests()}
            disabled={isLoading}
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 mb-6">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-prime-ink absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            aria-label="Search requests"
            placeholder="Search by task ID, payee, purpose…"
            value={searchQuery}
            onChange={(e) => {
              setSelectedRequest(null);
              setSearchQuery(e.target.value);
            }}
            className="w-full min-h-11 pl-9 pr-3 bg-prime-white border border-prime-rule focus:border-prime-blue text-xs focus:outline-none transition-colors"
          />
        </div>
        {viewerCanViewAll && <div className="relative">
          <Building2 className="w-3.5 h-3.5 text-prime-ink absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <select
            aria-label="Filter requests by department"
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="min-h-11 pl-9 pr-4 bg-prime-white border border-prime-rule focus:border-prime-blue text-xs focus:outline-none cursor-pointer transition-colors"
          >
            {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
          </select>
        </div>}
      </div>

      {selectedRequest && (
        <section aria-label="Request details" className="mb-6 bg-prime-white border border-prime-rule shadow-none">
          <div className="flex items-start justify-between gap-4 border-b border-prime-rule px-5 py-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-prime-ink">Request details</p>
              <h2 className="font-serif italic text-2xl text-prime-blue mt-1">{selectedRequest.payee}</h2>
              <p className="text-xs text-prime-ink mt-1">{selectedRequest.requestId} · {selectedRequest.formType.toUpperCase()}</p>
            </div>
            <button type="button" aria-label="Close request details" onClick={closeRequest} className="p-2 text-prime-ink hover:text-prime-blue">
              <X size={18} />
            </button>
          </div>
          <RequestTimeline request={selectedRequest} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-prime-rule">
            {[
              ["Department", selectedRequest.department],
              ["Amount", `₱${Number(selectedRequest.totalAmount || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
              ["Stage", selectedRequest.stageLabel],
              ["Requested by", selectedRequest.requestedBy],
            ].map(([label, value]) => (
              <div key={label} className="bg-prime-white px-5 py-4">
                <p className="text-[10px] uppercase tracking-[0.16em] text-prime-ink">{label}</p>
                <p className="text-sm text-prime-ink mt-1">{value || "—"}</p>
              </div>
            ))}
          </div>
          <div className="px-5 py-4 space-y-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-prime-ink mb-1">Purpose</p>
              <p className="text-sm text-prime-ink whitespace-pre-wrap">{selectedRequest.purpose || "No purpose provided."}</p>
            </div>
            {selectedRequest.attachments.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] text-prime-ink mb-2">Attachments</p>
                <div className="flex flex-wrap gap-2">
                  {selectedRequest.attachments.map((attachment) => (
                    <a key={attachment.id} href={attachment.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 border border-prime-rule px-3 py-2 text-xs text-prime-blue hover:bg-prime-white">
                      {attachment.name} <ExternalLink size={12} />
                    </a>
                  ))}
                </div>
              </div>
            )}
            <a href={selectedRequest.taskUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs text-prime-blue hover:underline">
              Open in ClickUp <ExternalLink size={12} />
            </a>
          </div>
        </section>
      )}

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
            type="button"
            onClick={() => { setSearchQuery(""); setSelectedDept("All Departments"); fetchRequests(); }}
            className="prime-button secondary"
          >
            <RefreshCw size={14} />
            <span>Reset filters</span>
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
                role="button"
                tabIndex={0}
                onClick={() => openRequest(req)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openRequest(req);
                  }
                }}
                aria-label={`View status for ${req.payee || req.requestId}`}
                className={`group bg-prime-white border-l-4 ${stageColor(req.currentStage, req.isRevisionRequested)} border border-prime-rule px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-none cursor-pointer transition-all hover:border-prime-blue hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-prime-blue/30`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className="font-sans tabular-nums text-[11px] font-medium text-prime-blue bg-prime-white px-1.5 py-0.5 border border-prime-rule">
                      {req.requestId}
                    </span>
                    {req.formType && (
                      <span className="text-[11px] font-medium uppercase px-1.5 py-0.5 bg-prime-blue text-prime-white">
                        {req.formType.toUpperCase()}
                      </span>
                    )}
                    <span className="text-[11px] font-medium uppercase text-prime-ink bg-prime-white px-1.5 py-0.5">
                      {req.department}
                    </span>
                    <span className={`text-[11px] font-medium px-1.5 py-0.5 border ${req.currentStage === "completed" ? "border-prime-blue text-prime-blue" : "border-prime-gold text-prime-blue"}`}>
                      {req.stageLabel}
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
                  <p className="text-base sm:text-lg font-semibold text-prime-blue truncate group-hover:underline">{req.payee || "Unnamed request"}</p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-[11px] text-prime-ink">
                    <span>{req.department || "No department"}</span>
                    <span className="text-prime-ink/40">•</span>
                    <span className="line-clamp-1">{req.purpose || "No purpose provided"}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-5 shrink-0 sm:min-w-[190px]">
                  <div className="text-left sm:text-right">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-prime-ink">Total amount</p>
                    <p className="font-bebas text-2xl text-prime-blue tracking-wider">₱{total}</p>
                  </div>
                  {req.isRevisionRequested ? (
                    <Link
                      href={`/form?taskId=${req.taskId}`}
                      onClick={(event) => event.stopPropagation()}
                      className="h-8 px-3 bg-prime-blue hover:bg-prime-blue text-prime-white text-xs font-medium flex items-center gap-1.5 transition-colors"
                    >
                      <Edit3 className="w-3 h-3" /> Edit
                    </Link>
                  ) : <span className="text-[10px] uppercase tracking-[0.16em] text-prime-blue opacity-0 transition-opacity group-hover:opacity-100">View status →</span>}
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
