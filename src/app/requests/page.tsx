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
  PhilippinePeso,
  Milestone,
  UserRound,
} from "lucide-react";
import { TrackedRfp } from "../api/rfp/track/route";
import { DEPARTMENT_NAMES } from "@/types/rfp";

const DEPARTMENTS = ["All Departments", ...DEPARTMENT_NAMES];

import type { RfpMilestoneKey } from "@/lib/rfpWorkflow";

interface WorkflowMilestoneDef {
  key: RfpMilestoneKey;
  label: string;
}

interface WorkflowStageDef {
  label: string;
  milestones: WorkflowMilestoneDef[];
}

const WORKFLOW_STAGES: WorkflowStageDef[] = [
  {
    label: "Submission",
    milestones: [{ key: "requestorFormSubmission", label: "Requestor Form Submission" }],
  },
  {
    label: "TL Approval",
    milestones: [{ key: "tlReviewAndApproval", label: "TL Review and Approval" }],
  },
  {
    label: "Finance",
    milestones: [
      { key: "financeValidation", label: "Finance Validation" },
      { key: "financeProcessing", label: "Finance Processing" },
      { key: "paymentPreparation", label: "Payment Preparation" },
    ],
  },
  {
    label: "Management Approval",
    milestones: [{ key: "managementApproval", label: "CFO/CEO Sign-Off" }],
  },
  {
    label: "Payment",
    milestones: [
      { key: "paymentRelease", label: "Payment Release" },
      { key: "paymentDocumentation", label: "Payment Documentation" },
    ],
  },
  {
    label: "Completed",
    milestones: [{ key: "recordsFiling", label: "Records Filing" }],
  },
];

function normalizeMilestone(value: string) {
  return value.toLowerCase().replace(/^finance\s+/, "").replace(/[^a-z0-9]+/g, " ").trim();
}

function getMilestoneTimestampDisplay(request: TrackedRfp, milestoneKey: RfpMilestoneKey): string | null {
  return request.milestoneTimestamps?.[milestoneKey] || null;
}

function RequestTimeline({ request }: { request: TrackedRfp }) {
  const activeIndex = Math.max(0, Math.min(request.stageIndex, WORKFLOW_STAGES.length - 1));

  return (
    <div className="border-b border-prime-rule bg-prime-white px-4 py-6 sm:px-7">
      <div className="overflow-x-auto pb-2">
        <div className="grid min-w-[1040px] grid-cols-6 gap-3">
          {WORKFLOW_STAGES.map((stage, index) => {
            const complete = index < activeIndex;
            const active = index === activeIndex;
            const currentMilestoneIndex = Math.max(
              0,
              stage.milestones.findIndex(
                (m) => normalizeMilestone(m.label) === normalizeMilestone(request.currentMilestone)
              )
            );
            return (
              <div
                key={stage.label}
                className={`relative border px-3 py-4 ${
                  active ? "border-prime-gold bg-prime-gold/5" : "border-prime-rule bg-prime-white"
                }`}
              >
                {index < WORKFLOW_STAGES.length - 1 && (
                  <span
                    className={`absolute left-full top-7 z-10 h-px w-3 ${
                      complete ? "bg-prime-blue" : "bg-prime-rule"
                    }`}
                    aria-hidden="true"
                  />
                )}
                <div className="flex items-center gap-2">
                  <span
                    className={`relative z-20 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold ${
                      active
                        ? "border-prime-gold bg-prime-gold text-prime-blue"
                        : complete
                        ? "border-prime-blue bg-prime-blue text-prime-white"
                        : "border-prime-rule bg-prime-white text-prime-ink"
                    }`}
                  >
                    {complete ? <Check size={13} strokeWidth={2.5} /> : active ? <Clock3 size={14} /> : index + 1}
                  </span>
                  <div className="min-w-0 text-left">
                    <p className={`text-[10px] uppercase tracking-[0.15em] ${active ? "text-prime-blue" : "text-prime-ink/65"}`}>
                      Stage {index + 1}
                    </p>
                    <p className={`text-xs font-semibold leading-tight ${active ? "text-prime-blue" : "text-prime-ink"}`}>
                      {stage.label}
                    </p>
                  </div>
                </div>
                <div className="mt-4 space-y-2 border-l border-prime-rule pl-3 text-left">
                  {active && request.isRevisionRequested ? (
                    <p className="text-[11px] font-medium text-prime-blue">Revision requested</p>
                  ) : (
                    stage.milestones.map((milestone, milestoneIndex) => {
                      const milestoneComplete = complete || (active && milestoneIndex < currentMilestoneIndex);
                      const milestoneActive = active && milestoneIndex === currentMilestoneIndex;
                      const tsDisplay = getMilestoneTimestampDisplay(request, milestone.key);

                      return (
                        <div key={milestone.key} className="relative pl-2">
                          <span
                            className={`absolute -left-[17px] top-1 flex h-2.5 w-2.5 items-center justify-center rounded-full border ${
                              milestoneActive
                                ? "border-prime-gold bg-prime-gold text-prime-blue"
                                : milestoneComplete
                                ? "border-prime-blue bg-prime-blue text-prime-white"
                                : "border-prime-rule bg-prime-white"
                            }`}
                            aria-hidden="true"
                          >
                            {milestoneComplete && <Check size={7} strokeWidth={3} />}
                          </span>
                          <p
                            className={`text-[11px] leading-tight ${
                              milestoneActive
                                ? "font-semibold text-prime-blue"
                                : milestoneComplete
                                ? "font-medium text-prime-ink"
                                : "text-prime-ink/55"
                            }`}
                          >
                            {milestone.label}
                          </p>
                          {(tsDisplay || (!milestoneActive && !milestoneComplete)) && (
                            <p className="mt-1 text-[9px] leading-tight text-prime-ink/65">
                              {tsDisplay || "Pending"}
                            </p>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
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
          {/* Header */}
          <div className="border-b border-prime-rule px-5 py-4">
            {/* First line: label and close control */}
            <div className="flex items-center justify-between gap-4">
              <p className="text-[10px] uppercase tracking-[0.2em] text-prime-ink font-semibold">Request details</p>
              <button
                type="button"
                aria-label="Close request details"
                onClick={closeRequest}
                className="p-1 text-prime-ink hover:text-prime-blue transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            {/* Second line: canonical name on left and formatted amount on right, baseline aligned */}
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 mt-1.5">
              <h2 className="text-lg font-semibold text-prime-blue leading-tight break-words">
                {selectedRequest.taskName}
              </h2>
              <div className="shrink-0 text-left sm:text-right">
                <span className="font-bebas text-2xl text-prime-blue tracking-wider">
                  ₱{Number(selectedRequest.totalAmount || 0).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>
          </div>

          <RequestTimeline request={selectedRequest} />

          {/* Compact details row: Department, Requestor, Approver, Purpose */}
          <div className="border-b border-prime-rule px-5 py-4 bg-prime-white">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-prime-rule">
              {/* Department */}
              <div className="lg:col-span-2 sm:pr-4">
                <p className="text-[9px] uppercase tracking-[0.18em] text-prime-ink font-semibold">Department</p>
                <p className="mt-1 text-xs font-medium text-prime-blue truncate">
                  {selectedRequest.department || "—"}
                </p>
              </div>
              {/* Requestor */}
              <div className="lg:col-span-3 sm:px-4 pt-2 sm:pt-0">
                <p className="text-[9px] uppercase tracking-[0.18em] text-prime-ink font-semibold">Requestor</p>
                <p className="mt-1 text-xs font-medium text-prime-blue truncate">
                  {selectedRequest.requestedBy || "—"}
                </p>
                {selectedRequest.requestedByEmail && (
                  <p className="text-[10px] text-prime-ink/75 truncate mt-0.5">
                    {selectedRequest.requestedByEmail}
                  </p>
                )}
              </div>
              {/* Approver */}
              <div className="lg:col-span-3 sm:px-4 pt-2 sm:pt-0">
                <p className="text-[9px] uppercase tracking-[0.18em] text-prime-ink font-semibold">Approver</p>
                <p className="mt-1 text-xs font-medium text-prime-blue truncate">
                  {selectedRequest.approverName || "—"}
                </p>
                {selectedRequest.approverEmail && (
                  <p className="text-[10px] text-prime-ink/75 truncate mt-0.5">
                    {selectedRequest.approverEmail}
                  </p>
                )}
              </div>
              {/* Purpose */}
              <div className="lg:col-span-4 sm:pl-4 pt-2 sm:pt-0">
                <p className="text-[9px] uppercase tracking-[0.18em] text-prime-ink font-semibold">Purpose</p>
                <p
                  className="mt-1 text-xs text-prime-ink line-clamp-2"
                  title={selectedRequest.purpose || "No purpose provided."}
                >
                  {selectedRequest.purpose || "No purpose provided."}
                </p>
              </div>
            </div>
          </div>

          {/* Attachments */}
          {selectedRequest.attachments.length > 0 && (
            <div className="px-5 py-4">
              <p className="text-[10px] uppercase tracking-[0.16em] text-prime-ink mb-2 font-semibold">Attachments</p>
              <div className="flex flex-wrap gap-2">
                {selectedRequest.attachments.map((attachment) => (
                  <a
                    key={attachment.id}
                    href={attachment.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 border border-prime-rule px-3 py-2 text-xs text-prime-blue hover:bg-prime-white"
                  >
                    {attachment.name} <ExternalLink size={12} />
                  </a>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Results stay out of the visual hierarchy while one request is open. */}
      {!selectedRequest && (isLoading ? (
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
                    {req.currentStage !== "completed" && (
                      <span className="text-[11px] font-medium px-1.5 py-0.5 border border-prime-gold text-prime-blue">
                        {req.stageLabel}
                      </span>
                    )}
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
                  <p className="text-base sm:text-lg font-semibold text-prime-blue truncate group-hover:underline">{req.taskName || req.payee || "Unnamed request"}</p>
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
      ))}
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
