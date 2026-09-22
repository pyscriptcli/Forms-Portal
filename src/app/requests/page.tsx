"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef, Suspense } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { useSearchParams } from "next/navigation";
import {
  Search,
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

function formatRelativeTime(isoString?: string | null): string {
  if (!isoString) return "";
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-PH", {
    timeZone: "Asia/Manila",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function RequestTimeline({ request }: { request: TrackedRfp }) {
  const activeIndex = Math.max(0, Math.min(request.stageIndex, WORKFLOW_STAGES.length - 1));
  const [selectedStageIndex, setSelectedStageIndex] = useState(activeIndex);

  useEffect(() => {
    setSelectedStageIndex(activeIndex);
  }, [request.taskId, activeIndex]);

  const selectedStage = WORKFLOW_STAGES[selectedStageIndex] || WORKFLOW_STAGES[0];
  const isSelectedActive = selectedStageIndex === activeIndex;

  const currentMilestoneIndex = Math.max(
    0,
    selectedStage.milestones.findIndex(
      (m) => normalizeMilestone(m.label) === normalizeMilestone(request.currentMilestone)
    )
  );

  return (
    <div className="border-b border-prime-rule bg-prime-white px-4 py-4 sm:px-6">
      {/* Compact 6-Stage Progress Rail (fits desktop without horizontal scroll; 2 rows on narrow screens) */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-2 w-full">
        {WORKFLOW_STAGES.map((stage, index) => {
          const isComplete = index < activeIndex;
          const isActive = index === activeIndex;
          const isSelected = index === selectedStageIndex;

          // Find the latest reached timestamp for this stage
          let latestStageTimestamp: string | null = null;
          for (let i = stage.milestones.length - 1; i >= 0; i--) {
            const ts = request.milestoneTimestamps?.[stage.milestones[i].key];
            if (ts && ts !== "Timestamp unavailable") {
              latestStageTimestamp = ts;
              break;
            }
          }

          return (
            <button
              key={stage.label}
              type="button"
              onClick={() => setSelectedStageIndex(index)}
              className={`p-2.5 text-left border transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? "border-prime-blue bg-prime-blue/[0.04] ring-1 ring-prime-blue"
                  : isActive
                  ? "border-prime-gold bg-prime-gold/5 hover:border-prime-blue"
                  : "border-prime-rule bg-prime-white hover:border-prime-ink/40"
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold border ${
                    isComplete
                      ? "border-prime-blue bg-prime-blue text-prime-white"
                      : isActive
                      ? "border-prime-gold bg-prime-gold text-prime-blue"
                      : "border-prime-rule bg-prime-white text-prime-ink/70"
                  }`}
                >
                  {isComplete ? <Check size={11} strokeWidth={2.5} /> : isActive ? <Clock3 size={11} /> : index + 1}
                </span>
                <span className="text-[9px] uppercase tracking-wider font-semibold text-prime-ink/60">
                  {index + 1}
                </span>
              </div>
              <p
                className={`text-xs font-semibold leading-tight line-clamp-1 ${
                  isActive ? "text-prime-blue" : isComplete ? "text-prime-ink" : "text-prime-ink/70"
                }`}
              >
                {stage.label}
              </p>
              <p className="mt-1 text-[9px] leading-tight text-prime-ink/60 truncate">
                {latestStageTimestamp || (isComplete || isActive ? "Active" : "Pending")}
              </p>
            </button>
          );
        })}
      </div>

      {/* Compact Milestone Detail Strip for Selected Stage */}
      <div className="mt-3 border border-prime-rule bg-prime-white p-3">
        <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-prime-rule">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-prime-ink">
              Stage {selectedStageIndex + 1}: {selectedStage.label}
            </span>
            {selectedStageIndex === activeIndex && (
              <span className="text-[9px] uppercase font-semibold px-1.5 py-0.5 bg-prime-gold/20 text-prime-blue border border-prime-gold/40">
                Current Stage
              </span>
            )}
          </div>
          <span className="text-[9px] text-prime-ink/60">
            {selectedStage.milestones.length} {selectedStage.milestones.length === 1 ? "Milestone" : "Milestones"}
          </span>
        </div>

        {isSelectedActive && request.isRevisionRequested ? (
          <div className="p-3 border border-prime-gold bg-prime-gold/10 text-xs text-prime-blue">
            <p className="font-semibold uppercase tracking-[0.12em]">Revision Requested</p>
            {request.revisionRequestedAt && <p className="mt-1">{request.revisionRequestedAt}</p>}
            {request.revisionRequestedBy && <p className="mt-0.5">Requested by {request.revisionRequestedBy}</p>}
            <p className="mt-2 font-medium">Reason: {request.revisionReason || "Please review notes and update submission."}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {selectedStage.milestones.map((milestone, mIdx) => {
              const isStageComplete = selectedStageIndex < activeIndex;
              const isMilestoneComplete =
                isStageComplete ||
                (isSelectedActive && (currentMilestoneIndex > mIdx || (request.currentStage === "completed" && mIdx <= currentMilestoneIndex)));
              const isMilestoneActive =
                isSelectedActive && mIdx === currentMilestoneIndex && request.currentStage !== "completed";
              const isMilestonePending = !isMilestoneComplete && !isMilestoneActive;

              const tsDisplay = request.milestoneTimestamps?.[milestone.key];

              return (
                <div key={milestone.key} className="flex items-start gap-2 text-left">
                  <span
                    className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[9px] ${
                      isMilestoneComplete
                        ? "border-prime-blue bg-prime-blue text-prime-white"
                        : isMilestoneActive
                        ? "border-prime-gold bg-prime-gold text-prime-blue"
                        : "border-prime-rule bg-prime-white text-transparent"
                    }`}
                  >
                    {isMilestoneComplete && <Check size={10} strokeWidth={3} />}
                    {isMilestoneActive && <Clock3 size={10} strokeWidth={2.5} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-xs leading-tight ${
                        isMilestoneActive
                          ? "font-semibold text-prime-blue"
                          : isMilestoneComplete
                          ? "font-medium text-prime-ink"
                          : "text-prime-ink/60"
                      }`}
                    >
                      {milestone.label}
                    </p>
                    <p className="mt-0.5 text-[10px] leading-tight text-prime-ink/70">
                      {isMilestonePending
                        ? "Pending"
                        : tsDisplay || "Timestamp unavailable"}
                    </p>
                    {!isMilestonePending && request.milestoneActors?.[milestone.key] && (
                      <p className="mt-0.5 text-[10px] leading-tight text-prime-ink/60">
                        Moved by {request.milestoneActors[milestone.key]}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function RequestsContent() {
  const searchParams = useSearchParams();
  const initialId = searchParams.get("id") ?? "";

  const [searchQuery, setSearchQuery] = useState(initialId);
  const [requestTab, setRequestTab] = useState<"pending" | "completed">("pending");
  const [allRequests, setAllRequests] = useState<TrackedRfp[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<TrackedRfp | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [isStale, setIsStale] = useState(false);
  const [staleWarning, setStaleWarning] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const lastFetchTimeRef = useRef<number>(0);
  const activeRequestIdRef = useRef<string | null>(initialId || null);

  const fetchQueue = useCallback(async (forceRefresh = false) => {
    if (forceRefresh) {
      setIsUpdating(true);
    } else if (lastFetchTimeRef.current === 0) {
      setIsLoading(true);
    } else {
      setIsUpdating(true);
    }

    try {
      const url = `/api/rfp/track${forceRefresh ? "?forceRefresh=true" : ""}`;
      const res = await fetch(url);
      const data = await res.json();

      if (res.ok && data.success) {
        const nextRequests: TrackedRfp[] = data.requests ?? [];
        setAllRequests(nextRequests);
        setFetchedAt(data.fetchedAt || new Date().toISOString());
        setIsStale(Boolean(data.isStale));
        setStaleWarning(data.warning || null);
        setFetchError(null);
        lastFetchTimeRef.current = Date.now();

        // Synchronize selected request with updated data
        const activeId = activeRequestIdRef.current;
        if (activeId) {
          const matching = nextRequests.find((r) => r.taskId === activeId);
          if (matching) {
            setSelectedRequest(matching);
          }
        }
      } else {
        if (allRequests.length === 0) {
          setFetchError(data.message || "Failed to load requests from ClickUp.");
        } else {
          setIsStale(true);
          setStaleWarning(`Unable to refresh. Showing data from ${formatRelativeTime(fetchedAt)}.`);
        }
      }
    } catch (err: any) {
      if (allRequests.length === 0) {
        setFetchError(err.message || "Network error loading requests.");
      } else {
        setIsStale(true);
        setStaleWarning(`Unable to refresh. Showing data from ${formatRelativeTime(fetchedAt)}.`);
      }
    } finally {
      setIsLoading(false);
      setIsUpdating(false);
    }
  }, [allRequests.length, fetchedAt]);

  // Initial load
  useEffect(() => {
    fetchQueue(false);
  }, []);

  // Revalidate when browser regains focus only if at least 15 seconds old
  useEffect(() => {
    const handleFocus = () => {
      if (Date.now() - lastFetchTimeRef.current >= 15_000) {
        fetchQueue(false);
      }
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [fetchQueue]);

  // Local filtering without network calls
  const filteredRequests = useMemo(() => {
    let list = allRequests.filter((request) =>
      requestTab === "completed"
        ? request.currentStage === "completed"
        : request.currentStage !== "completed"
    );
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (r) =>
          r.taskId.toLowerCase().includes(q) ||
          r.requestId.toLowerCase().includes(q) ||
          r.taskName.toLowerCase().includes(q) ||
          r.payee.toLowerCase().includes(q) ||
          r.department.toLowerCase().includes(q) ||
          r.purpose.toLowerCase().includes(q) ||
          r.requestedBy.toLowerCase().includes(q)
      );
    }
    return list;
  }, [allRequests, requestTab, searchQuery]);

  // Initial auto-selection
  useEffect(() => {
    if (selectedRequest && filteredRequests.some((request) => request.taskId === selectedRequest.taskId)) return;
    const nextRequest = (initialId && filteredRequests.find((request) => request.taskId === initialId)) || filteredRequests[0] || null;
    setSelectedRequest(nextRequest);
    activeRequestIdRef.current = nextRequest?.taskId || null;
  }, [filteredRequests, initialId, selectedRequest]);

  const openRequest = (request: TrackedRfp) => {
    setSelectedRequest(request);
    activeRequestIdRef.current = request.taskId;
    window.history.pushState({}, "", `/requests?id=${encodeURIComponent(request.taskId)}`);
  };

  const closeRequest = () => {
    setSelectedRequest(null);
    activeRequestIdRef.current = null;
    window.history.pushState({}, "", "/requests");
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
          <div className="flex items-center gap-3">
            {isUpdating && (
              <span className="text-xs font-medium text-prime-blue flex items-center gap-1">
                <Loader2 size={13} className="animate-spin" />
                Updating...
              </span>
            )}
            {fetchedAt && !isUpdating && (
              <span className="text-[11px] text-prime-ink/60">
                Last updated: {formatRelativeTime(fetchedAt)}
              </span>
            )}
            <button
              type="button"
              className="prime-button secondary"
              onClick={() => fetchQueue(true)}
              disabled={isLoading || isUpdating}
            >
              <RefreshCw size={14} className={isUpdating ? "animate-spin" : ""} />
              <span>Refresh</span>
            </button>
          </div>
        }
      />

      {/* Stale Warning Banner */}
      {isStale && staleWarning && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle size={15} className="text-amber-600 shrink-0" />
            <span>{staleWarning}</span>
          </div>
          <button
            type="button"
            onClick={() => fetchQueue(true)}
            className="text-xs font-semibold text-amber-800 underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-1 border-b border-prime-rule mb-4" role="tablist" aria-label="Request status tabs">
        {([
          ["pending", "Pending"],
          ["completed", "Completed"],
        ] as const).map(([value, label]) => {
          const count = allRequests.filter((request) =>
            value === "completed" ? request.currentStage === "completed" : request.currentStage !== "completed"
          ).length;
          const isActive = requestTab === value;
          return (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setRequestTab(value)}
              className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] border-b-2 transition-colors cursor-pointer ${
                isActive
                  ? "border-prime-blue text-prime-blue"
                  : "border-transparent text-prime-ink/60 hover:text-prime-blue"
              }`}
            >
              {label} <span className="ml-1 text-[10px]">({count})</span>
            </button>
          );
        })}
      </div>
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
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        {/* Request Details Pane */}
        {selectedRequest && (
          <section
            aria-label="Request details"
            className="bg-prime-white border border-prime-rule shadow-none lg:order-2 lg:col-span-8"
          >
            {/* Header: First line label & close control; Second line canonical title & inline amount */}
            <div className="border-b border-prime-rule px-5 py-4">
              <div className="flex items-center justify-between gap-4">
                <p className="text-[10px] uppercase tracking-[0.2em] text-prime-ink font-semibold">
                  Request details
                </p>
                <button
                  type="button"
                  aria-label="Close request details"
                  onClick={closeRequest}
                  className="p-1 text-prime-ink hover:text-prime-blue transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 mt-2">
                <h2 className="text-lg font-semibold text-prime-blue leading-tight break-words">
                  {selectedRequest.taskName}
                </h2>
                <div className="shrink-0 text-left sm:text-right">
                  <span className="font-bebas text-2xl text-prime-blue tracking-wider">
                    ₱
                    {Number(selectedRequest.totalAmount || 0).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* Compact 6-Stage Progress Rail and Detail Strip */}
            <RequestTimeline request={selectedRequest} />

            {/* Compact Details Row: Department, Requestor, Approver, Purpose */}
            <div className="border-b border-prime-rule px-5 py-4 bg-prime-white">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-prime-rule">
                {/* Department */}
                <div className="lg:col-span-2 sm:pr-4">
                  <p className="text-[9px] uppercase tracking-[0.18em] text-prime-ink font-semibold">
                    Department
                  </p>
                  <p className="mt-1 text-xs font-medium text-prime-blue truncate">
                    {selectedRequest.department || "—"}
                  </p>
                </div>
                {/* Requestor */}
                <div className="lg:col-span-3 sm:px-4 pt-2 sm:pt-0">
                  <p className="text-[9px] uppercase tracking-[0.18em] text-prime-ink font-semibold">
                    Requestor
                  </p>
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
                  <p className="text-[9px] uppercase tracking-[0.18em] text-prime-ink font-semibold">
                    Approver
                  </p>
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
                  <p className="text-[9px] uppercase tracking-[0.18em] text-prime-ink font-semibold">
                    Purpose
                  </p>
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
                <p className="text-[10px] uppercase tracking-[0.16em] text-prime-ink mb-2 font-semibold">
                  Attachments
                </p>
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

        {/* Left Column: Requests Queue List */}
        <div className="lg:order-1 lg:col-span-4">
          {isLoading ? (
            <div className="bg-prime-white border border-prime-rule p-12 text-center">
              <Loader2 className="w-6 h-6 animate-spin text-prime-blue mx-auto mb-2" />
              <p className="text-xs font-medium text-prime-ink">Loading requests…</p>
            </div>
          ) : fetchError ? (
            <div className="bg-prime-white border border-prime-rule p-12 text-center">
              <AlertTriangle className="w-8 h-8 text-amber-600 mx-auto mb-3" />
              <h3 className="font-serif italic font-medium text-lg text-prime-ink">Failed to load requests</h3>
              <p className="text-xs text-prime-ink mt-1 mb-5">{fetchError}</p>
              <button
                type="button"
                onClick={() => fetchQueue(true)}
                className="prime-button secondary"
              >
                <RefreshCw size={14} />
                <span>Retry</span>
              </button>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="bg-prime-white border border-prime-rule p-12 text-center">
              <FileText className="w-8 h-8 text-prime-ink mx-auto mb-3" />
              <h3 className="font-serif italic font-medium text-lg text-prime-ink">No requests found</h3>
              <p className="text-xs text-prime-ink mt-1 mb-5">
                Try adjusting your search or submit a new request.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                }}
                className="prime-button secondary"
              >
                <RefreshCw size={14} />
                <span>Reset filters</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2 max-h-[calc(100vh-230px)] overflow-y-auto pr-1">
              {filteredRequests.map((req) => {
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
                    className={`group bg-prime-white border-l-4 ${stageColor(
                      req.currentStage,
                      req.isRevisionRequested
                    )} border px-4 py-3 shadow-none cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-prime-blue/30 ${
                      selectedRequest?.taskId === req.taskId
                        ? "border-prime-blue ring-1 ring-prime-blue"
                        : "border-prime-rule hover:border-prime-blue"
                    }`}
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
                      <p className="text-base sm:text-lg font-semibold text-prime-blue truncate group-hover:underline">
                        {req.taskName || req.payee || "Unnamed request"}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-[11px] text-prime-ink">
                        <span>{req.department || "No department"}</span>
                        <span className="text-prime-ink/40">•</span>
                        <span className="line-clamp-1">{req.purpose || "No purpose provided"}</span>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-4 border-t border-prime-rule pt-2">
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
                      ) : (
                        <span className="text-[10px] uppercase tracking-[0.16em] text-prime-blue opacity-0 transition-opacity group-hover:opacity-100">
                          View status →
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function RequestsPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-5xl mx-auto px-4 py-12 text-center text-xs text-prime-ink">
          Loading…
        </div>
      }
    >
      <RequestsContent />
    </Suspense>
  );
}
