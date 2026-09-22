"use client";
import { PrimeDialog } from "@/components/PrimeDialog";
import { PageHeader } from "@/components/PageHeader";
import { SignatureModal } from "@/components/SignatureModal";
import { PrimeDatePicker } from "@/components/PrimeDatePicker";

import React, { useState, useEffect, useCallback, useMemo, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Paperclip,
  ExternalLink,
  Search,
  Building2,
  Loader2,
  AlertCircle,
  AlertTriangle,
  Eye,
  Check,
  Send,
  PenTool,
  RefreshCw,
} from "lucide-react";
import confetti from "canvas-confetti";
import { TrackedRfp } from "../api/rfp/track/route";
import { DEPARTMENT_NAMES } from "@/types/rfp";
import { useAuth } from "@/components/AuthProvider";

const DEPARTMENTS = ["All Departments", ...DEPARTMENT_NAMES];

function todayMMDDYYYY() {
  const now = new Date();
  return `${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")}/${now.getFullYear()}`;
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

function ApprovalsContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const directTaskId = searchParams.get("taskId") || "";

  const [searchQuery, setSearchQuery] = useState(directTaskId);
  const [selectedDept, setSelectedDept] = useState("All Departments");
  const [allRequests, setAllRequests] = useState<TrackedRfp[]>([]);
  const [approvalTab, setApprovalTab] = useState<"pending" | "approved">("pending");
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [activeRequest, setActiveRequest] = useState<TrackedRfp | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [isStale, setIsStale] = useState(false);
  const [staleWarning, setStaleWarning] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const lastFetchTimeRef = useRef<number>(0);
  const activeTaskIdRef = useRef<string | null>(directTaskId || null);

  // Approval modal states
  const [approverName, setApproverName] = useState("Team Leader");
  const [approvalNotes, setApprovalNotes] = useState("");
  const [approvalDate, setApprovalDate] = useState(todayMMDDYYYY);
  const [approverSignature, setApproverSignature] = useState("");
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  // Revision modal states
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
  const [revisionReason, setRevisionReason] = useState("");
  const [isSubmittingRevision, setIsSubmittingRevision] = useState(false);

  // Active preview tab for documents
  const [activeDocTab, setActiveDocTab] = useState<"form" | "quote">("form");

  const [actionSuccessMessage, setActionSuccessMessage] = useState("");

  useEffect(() => {
    if (user?.username) setApproverName(user.username);
  }, [user?.username]);

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
        const list: TrackedRfp[] = data.requests || [];
        setAllRequests(list);
        setFetchedAt(data.fetchedAt || new Date().toISOString());
        setIsStale(Boolean(data.isStale));
        setStaleWarning(data.warning || null);
        setFetchError(null);
        lastFetchTimeRef.current = Date.now();

        // Keep active selection synchronized with fresh data
        const currentActiveId = activeTaskIdRef.current;
        if (currentActiveId) {
          const matching = list.find((r) => r.taskId === currentActiveId);
          if (matching) setActiveRequest(matching);
        }
      } else {
        if (allRequests.length === 0) {
          setFetchError(data.message || "Failed to load approval requests.");
        } else {
          setIsStale(true);
          setStaleWarning("Unable to refresh approval queue from ClickUp.");
        }
      }
    } catch (err: any) {
      if (allRequests.length === 0) {
        setFetchError(err.message || "Network error loading approval requests.");
      } else {
        setIsStale(true);
        setStaleWarning("Unable to refresh approval queue from ClickUp.");
      }
    } finally {
      setIsLoading(false);
      setIsUpdating(false);
    }
  }, [allRequests.length]);

  useEffect(() => {
    fetchQueue(false);
  }, []);

  // Revalidate on focus only if at least 15 seconds old
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
  const requests = useMemo(() => {
    let list = allRequests.filter((request) =>
      approvalTab === "pending"
        ? request.currentStage === "submitted" || request.currentStage === "revision_requested"
        : request.currentStage !== "submitted" && request.currentStage !== "revision_requested"
    );

    if (selectedDept !== "All Departments") {
      list = list.filter((r) => r.department.toLowerCase() === selectedDept.toLowerCase());
    }

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
  }, [allRequests, approvalTab, selectedDept, searchQuery]);

  // Automatic active card selection from local filtered list
  useEffect(() => {
    if (!activeRequest && requests.length > 0) {
      if (directTaskId) {
        const direct = requests.find((r) => r.taskId === directTaskId);
        if (direct) {
          setActiveRequest(direct);
          activeTaskIdRef.current = direct.taskId;
          return;
        }
      }
      setActiveRequest(requests[0]);
      activeTaskIdRef.current = requests[0].taskId;
    } else if (activeRequest && !requests.some((r) => r.taskId === activeRequest.taskId)) {
      setActiveRequest(requests[0] || null);
      activeTaskIdRef.current = requests[0]?.taskId || null;
    }
  }, [requests, activeRequest, directTaskId]);

  const handleApprove = async () => {
    if (!activeRequest) return;
    setIsApproving(true);
    try {
      const res = await fetch("/api/rfp/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: activeRequest.taskId,
          action: "approve",
          approverName,
          approvalDate,
          signatureDataUrl: approverSignature,
          notes: approvalNotes,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to approve request");
      }

      // Celebrate!
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 }, colors: ["#003366", "#C9A84C"] });
      setActionSuccessMessage(`✅ Endorsed #${activeRequest.taskId}! Advanced to Finance Validation.`);
      setApprovalNotes("");
      setApproverSignature("");
      setApprovalDate(todayMMDDYYYY());

      // Refresh list
      setTimeout(() => {
        fetchQueue(true);
        setActiveRequest(null);
        activeTaskIdRef.current = null;
      }, 1000);
    } catch (err: any) {
      alert(`Approval error: ${err.message}`);
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    if (!activeRequest || !revisionReason.trim()) return;
    setIsSubmittingRevision(true);
    try {
      const res = await fetch("/api/rfp/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: activeRequest.taskId,
          action: "reject",
          approverName,
          revisionReason,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to submit revision request");
      }

      setIsRevisionModalOpen(false);
      setRevisionReason("");
      setActionSuccessMessage(`⚠️ Revision requested for #${activeRequest.taskId}. Requestor has been notified.`);

      // Refresh list
      setTimeout(() => {
        fetchQueue(true);
        setActiveRequest(null);
        activeTaskIdRef.current = null;
      }, 1000);
    } catch (err: any) {
      alert(`Revision request error: ${err.message}`);
    } finally {
      setIsSubmittingRevision(false);
    }
  };

  // Find form preview image and quotation attachment from active request
  const formPreviewAtt = activeRequest?.attachments.find(
    (a) => a.name.toLowerCase().includes("preview") || a.name.toLowerCase().endsWith(".png")
  );
  const pdfAtt = activeRequest?.attachments.find(
    (a) => a.name.toLowerCase().endsWith(".pdf")
  );
  const quoteAtt = activeRequest?.attachments.find(
    (a) =>
      !a.name.toLowerCase().includes("preview") &&
      !a.name.toLowerCase().startsWith("rfp_")
  );
  const primaryDocument = pdfAtt ?? formPreviewAtt;
  const portalDocumentUrl = (url: string) => `/api/rfp/attachment?url=${encodeURIComponent(url)}`;
  const approvalLineItems = activeRequest?.lineItems?.length
    ? activeRequest.lineItems
    : activeRequest
      ? [{ description: activeRequest.purpose || "Request total — see official RFP for line-item detail", unitPrice: activeRequest.totalAmount, quantity: 1, amount: activeRequest.totalAmount }]
      : [];
  const renderDocument = (attachment: { name: string; url: string }, label: string) => {
    const isImage = /\.(jpeg|jpg|png|webp|gif)$/i.test(attachment.url) || /\.(jpeg|jpg|png|webp|gif)$/i.test(attachment.name);
    const isPdf = /\.pdf($|\?)/i.test(attachment.url) || /\.pdf$/i.test(attachment.name);
    if (isImage) return <img src={portalDocumentUrl(attachment.url)} alt={label} className="max-w-full max-h-[400px] object-contain border border-prime-rule mx-auto" />;
    if (isPdf) return <iframe src={`${portalDocumentUrl(attachment.url)}#toolbar=1&view=FitH`} title={label} className="h-[400px] w-full border border-prime-rule bg-white" />;
    return <div className="py-8 text-center"><Paperclip className="w-8 h-8 text-prime-ink mx-auto mb-2" /><p className="text-xs font-medium text-prime-ink">{attachment.name}</p></div>;
  };

  return (
    <div className="prime-page">
      <PageHeader
        title="Approvals"
        description="Review requests and supporting documents before endorsing payment."
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
            {user?.role === "approver" ? (
              <span className="prime-field inline-flex items-center text-sm">My department</span>
            ) : <select
              aria-label="Filter approvals by department"
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="prime-field"
            >
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>}
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

      {actionSuccessMessage && (
        <div role="status" className="prime-notice mb-6 flex items-center justify-between gap-4">
          <span>{actionSuccessMessage}</span>
          <button type="button" aria-label="Dismiss confirmation" onClick={() => setActionSuccessMessage("")}>
            Dismiss
          </button>
        </div>
      )}

      <div className="mb-5 flex border-b border-prime-rule" role="tablist" aria-label="Approval queues">
        {(["pending", "approved"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={approvalTab === tab}
            onClick={() => {
              setApprovalTab(tab);
              setActiveRequest(null);
            }}
            className={`min-w-32 border-b-2 px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em] ${
              approvalTab === tab ? "border-prime-blue text-prime-blue" : "border-transparent text-prime-ink/60"
            }`}
          >
            {tab === "pending" ? "Pending" : "Approved"}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="bg-prime-white border border-prime-rule p-12 text-center">
          <Loader2 className="w-6 h-6 animate-spin text-prime-blue mx-auto mb-2" />
          <p className="text-xs font-medium text-prime-ink">Loading {approvalTab} requests...</p>
        </div>
      ) : fetchError ? (
        <div className="bg-prime-white border border-prime-rule p-12 text-center">
          <AlertTriangle className="w-8 h-8 text-amber-600 mx-auto mb-3" />
          <h3 className="font-serif italic font-medium text-lg text-prime-ink">Failed to load approvals</h3>
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
      ) : requests.length === 0 ? (
        <div className="bg-prime-white border border-prime-rule p-12 text-center shadow-none">
          <div className="w-12 h-12 bg-prime-white text-prime-blue rounded-none flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="font-serif italic font-medium text-xl text-prime-ink">All caught up!</h3>
          <p className="text-xs text-prime-ink mt-1 max-w-sm mx-auto">
            There are currently no {approvalTab} payment requests in {selectedDept}.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Request List */}
          <div className="lg:col-span-4 space-y-3">
            <h2 className="text-xs uppercase tracking-wider font-medium text-prime-ink px-1">
              {approvalTab === "pending" ? "Pending approval" : "Approved requests"} ({requests.length})
            </h2>
            <div className="space-y-2 max-h-[700px] overflow-y-auto pr-1">
              {requests.map((req) => {
                const isSelected = activeRequest?.taskId === req.taskId;
                const formattedTotal = Number(req.totalAmount || 0).toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                });

                return (
                  <button
                    key={req.taskId}
                    type="button"
                    onClick={() => setActiveRequest(req)}
                    className={`w-full text-left p-4 border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-prime-white border-prime-blue shadow-none ring-1 ring-prime-blue"
                        : "bg-prime-white border-prime-rule hover:border-prime-rule hover:bg-prime-white"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-sans tabular-nums text-[11px] font-medium text-prime-blue bg-prime-white px-1.5 py-0.5 border border-prime-rule">
                          #{req.taskId}
                        </span>
                        <span className="text-[11px] font-medium uppercase tracking-wider px-1.5 py-0.5 bg-prime-blue text-prime-white">
                          {req.formType ? req.formType.toUpperCase() : "RFP"}
                        </span>
                      </div>
                      {req.urgency === "urgent" && (
                        <span className="text-[11px] font-medium text-prime-blue bg-prime-white px-1.5 py-0.5 border border-prime-rule">
                          URGENT
                        </span>
                      )}
                    </div>
                    <div className="font-medium text-xs text-prime-ink truncate">{req.payee}</div>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-prime-rule text-xs">
                      <span className="text-prime-ink text-[11px]">{req.department}</span>
                      <span className="font-bebas text-lg text-prime-blue leading-none">
                        ₱{formattedTotal}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Detailed Review & 1-Click Actions */}
          {activeRequest && (
            <div className="lg:col-span-8 bg-prime-white border border-prime-rule shadow-none p-6 relative">
              {/* Top Banner */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-prime-rule pb-5">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-sans tabular-nums text-xs font-medium text-prime-blue bg-prime-white px-2 py-0.5 border border-prime-rule">
                      Task #{activeRequest.taskId}
                    </span>
                    <span className="text-xs font-medium text-prime-ink uppercase bg-prime-white px-2 py-0.5">
                      {activeRequest.department}
                    </span>
                    {activeRequest.urgency === "urgent" && (
                      <span className="text-xs font-medium text-prime-blue bg-prime-white border border-prime-rule px-2 py-0.5">
                        🚨 URGENT
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl font-medium text-prime-ink tracking-tight mt-1">
                    {activeRequest.payee}
                  </h2>
                  <p className="text-xs text-prime-ink mt-0.5">
                    Requested by: <strong>{activeRequest.requestedBy}</strong> • Date Needed:{" "}
                    <strong>{activeRequest.dateNeeded || "Immediate"}</strong>
                  </p>
                </div>

                <div className="text-left sm:text-right shrink-0">
                  <span className="text-[11px] uppercase font-medium text-prime-ink block tracking-wider">
                    TOTAL PAYABLE
                  </span>
                  <span className="font-bebas text-3xl text-prime-blue tracking-wider block">
                    ₱
                    {Number(activeRequest.totalAmount || 0).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>

              {/* Purpose Box */}
              <div className="my-4 p-3 bg-prime-white border border-prime-rule">
                <span className="text-[11px] uppercase font-medium text-prime-ink tracking-wider block mb-1">
                  BUSINESS PURPOSE
                </span>
                <p className="text-xs text-prime-ink leading-relaxed">
                  {activeRequest.purpose || "No stated purpose provided."}
                </p>
              </div>

              {/* Line-item breakdown mirrors the official RFP table for fast approval review. */}
              <div className="my-4 border border-prime-rule bg-white">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-prime-blue bg-[#e8eef9] px-3 py-2">
                  <div>
                    <h3 className="text-[11px] font-bold uppercase tracking-[0.16em] text-prime-blue">Payment item breakdown</h3>
                    <p className="mt-0.5 text-[11px] text-prime-ink/65">Cross-check every amount against the supporting files below.</p>
                  </div>
                  <span className="border border-prime-blue/30 bg-white px-2 py-1 text-[10px] font-semibold text-prime-blue">{approvalLineItems.length} item{approvalLineItems.length === 1 ? "" : "s"}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] border-collapse text-xs">
                    <thead className="bg-[#dce5f7] text-prime-blue">
                      <tr>
                        <th className="w-[52%] border-b border-r border-prime-blue/50 px-3 py-2 text-left font-serif font-bold">Item / Description</th>
                        <th className="w-[16%] border-b border-r border-prime-blue/50 px-3 py-2 text-right font-serif font-bold">Unit Price</th>
                        <th className="w-[12%] border-b border-r border-prime-blue/50 px-3 py-2 text-center font-serif font-bold">Quantity</th>
                        <th className="w-[20%] border-b border-prime-blue/50 px-3 py-2 text-right font-serif font-bold">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {approvalLineItems.map((item, index) => (
                        <tr key={`${item.description}-${index}`} className="border-b border-prime-blue/30 align-top">
                          <td className="border-r border-prime-blue/30 px-3 py-3 leading-relaxed text-prime-ink">{item.description}</td>
                          <td className="border-r border-prime-blue/30 px-3 py-3 text-right tabular-nums text-prime-ink">{Number(item.unitPrice || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="border-r border-prime-blue/30 px-3 py-3 text-center tabular-nums text-prime-ink">{item.quantity}</td>
                          <td className="px-3 py-3 text-right tabular-nums text-prime-ink">{Number(item.amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-prime-surface/20">
                        <td colSpan={3} className="border-r border-prime-blue/40 px-3 py-3 text-right font-serif font-bold text-prime-blue">Total Price for Payment:</td>
                        <td className="px-3 py-3 text-right text-sm font-bold tabular-nums text-prime-blue">₱{Number(activeRequest.totalAmount || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                {!activeRequest.lineItems?.length && <p className="border-t border-prime-rule bg-amber-50 px-3 py-2 text-[11px] text-amber-900">This legacy request predates stored line-item data. The row above shows the request total; open the official RFP for its original breakdown.</p>}
              </div>

              {/* Document Review Tabs */}
              <div className="my-5 border border-prime-rule">
                <div className="flex items-center border-b border-prime-rule bg-prime-white">
                  <button
                    type="button"
                    onClick={() => setActiveDocTab("form")}
                    className={`px-4 py-2 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                      activeDocTab === "form"
                        ? "bg-prime-white text-prime-blue border-b-2 border-prime-blue"
                        : "text-prime-ink hover:text-prime-ink"
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Official Signed RFP</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveDocTab("quote")}
                    className={`px-4 py-2 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                      activeDocTab === "quote"
                        ? "bg-prime-white text-prime-blue border-b-2 border-prime-blue"
                        : "text-prime-ink hover:text-prime-ink"
                    }`}
                  >
                    <Paperclip className="w-3.5 h-3.5" />
                    <span>Supplier Quotation / Invoices ({quoteAtt ? "1" : "None"})</span>
                  </button>
                </div>

                {/* Tab Content */}
                <div className="p-4 bg-prime-white max-h-[450px] overflow-y-auto flex items-center justify-center">
                  {activeDocTab === "form" ? (
                    primaryDocument ? (
                      <div className="text-center">
                        {renderDocument(primaryDocument, "Official Signed RFP")}
                        <div className="mt-2">
                          <a
                              href={portalDocumentUrl(primaryDocument.url)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-medium text-prime-blue hover:underline inline-flex items-center gap-1"
                            >
                              <span>Open official RFP in new tab</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                        </div>
                      </div>
                    ) : (
                      <div className="py-8 text-center text-xs text-prime-ink">
                        No official RFP preview is available yet. Use the attachment links below.
                      </div>
                    )
                  ) : quoteAtt ? (
                    <div className="text-center w-full">
                      {quoteAtt.url.match(/\.(jpeg|jpg|png|webp|pdf)/i) ? (
                        renderDocument(quoteAtt, "Supplier quotation or invoice")
                      ) : (
                        <div className="py-8">
                          <Paperclip className="w-8 h-8 text-prime-ink mx-auto mb-2" />
                          <p className="text-xs font-medium text-prime-ink">{quoteAtt.name}</p>
                          <a
                            href={portalDocumentUrl(quoteAtt.url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-3 inline-flex items-center gap-1 px-3 py-1.5 bg-prime-blue text-prime-white text-xs font-medium shadow-none"
                          >
                            <span>Open Attachment in New Tab</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-xs text-prime-ink italic">
                      No external supplier quotation was attached to this RFP.
                    </div>
                  )}
                </div>
                {activeRequest && activeRequest.attachments.length > 0 && (
                  <div className="border-t border-prime-rule bg-prime-surface/20 px-4 py-3">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-prime-blue">All attached documents</p>
                      <span className="text-[10px] text-prime-ink/60">{activeRequest.attachments.length} file{activeRequest.attachments.length === 1 ? "" : "s"}</span>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {activeRequest.attachments.map((attachment) => (
                        <a key={attachment.id} href={portalDocumentUrl(attachment.url)} target="_blank" rel="noopener noreferrer" className="flex min-w-0 items-center gap-2 border border-prime-rule bg-white px-3 py-2 text-xs text-prime-blue hover:border-prime-gold">
                          <FileText className="h-3.5 w-3.5 shrink-0" />
                          <span className="min-w-0 flex-1 truncate" title={attachment.name}>{attachment.name}</span>
                          <ExternalLink className="h-3 w-3 shrink-0" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {approvalTab === "pending" ? <>{/* Approver endorsement */}
              <div className="pt-4 border-t border-prime-rule">
                <div className="mb-4 border border-prime-rule bg-prime-white">
                  <div className="border-b border-prime-rule px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-prime-gold">TL / Approver only</p>
                    <p className="mt-1 text-sm font-medium text-prime-blue">Complete the endorsement before advancing this request.</p>
                  </div>
                  <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-3">
                  <div>
                    <label className="text-[11px] font-medium text-prime-ink block mb-1">
                      Approver name / title
                    </label>
                    <input
                      type="text"
                      value={approverName}
                      readOnly
                      aria-readonly="true"
                      placeholder="Signed-in user profile name"
                      className="w-full bg-prime-surface/40 border border-prime-rule text-xs px-2.5 h-8 text-prime-ink/80"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-prime-ink block mb-1">Signature</label>
                    <button
                      type="button"
                      onClick={() => setIsSignatureModalOpen(true)}
                      className="flex h-14 w-full items-center justify-center gap-2 border border-prime-rule bg-prime-white px-3 text-xs font-medium text-prime-blue hover:border-prime-gold"
                    >
                      {approverSignature ? (
                        <><img src={approverSignature} alt="Approver signature" className="max-h-11 max-w-[180px] object-contain" /><span className="sr-only">Change signature</span></>
                      ) : (
                        <><PenTool className="h-4 w-4" /> Sign or upload</>
                      )}
                    </button>
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-prime-ink block mb-1">Approval date</label>
                    <PrimeDatePicker value={approvalDate} onChange={setApprovalDate} className="w-full" />
                  </div>
                  <div className="lg:col-span-3">
                    <label className="text-[11px] font-medium text-prime-ink block mb-1">
                      Optional endorsement note
                    </label>
                    <input
                      type="text"
                      value={approvalNotes}
                      onChange={(e) => setApprovalNotes(e.target.value)}
                      placeholder="e.g. Budget verified under Q4 promo allocation"
                      className="w-full bg-prime-white border border-prime-rule text-xs px-2.5 h-8 focus:outline-none focus:border-prime-blue"
                    />
                  </div>
                  </div>
                </div>

                {/* Big Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsRevisionModalOpen(true)}
                    disabled={isApproving}
                    className="w-full sm:w-auto h-10 px-5 bg-prime-white border border-prime-rule hover:bg-prime-white text-prime-blue text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <XCircle className="w-4 h-4 text-prime-blue" />
                    <span>Request Revision</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleApprove}
                    disabled={isApproving || !approverName.trim() || !approverSignature || !approvalDate.trim()}
                    className="w-full sm:w-auto h-10 px-8 bg-prime-blue hover:bg-prime-blue text-prime-white text-xs font-medium flex items-center justify-center gap-2 shadow-none transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isApproving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4 stroke-[3]" />
                    )}
                    <span>
                      {activeRequest.formType === "po"
                        ? "Endorse Purchase Order"
                        : activeRequest.formType === "pcv"
                        ? "Endorse Petty Cash"
                        : "Endorse Request"}
                    </span>
                  </button>
                </div>
              </div>
              </> : (
                <div className="mt-5 border border-prime-rule bg-prime-blue/[0.03] px-4 py-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-prime-gold">Approved</p>
                  <p className="mt-1 text-sm text-prime-blue">This request has been endorsed and is now read-only in the approval queue.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <PrimeDialog open={isRevisionModalOpen} title="Request a revision" onClose={isSubmittingRevision ? undefined : () => setIsRevisionModalOpen(false)}
        actions={<>
          <button className="prime-button secondary" disabled={isSubmittingRevision} onClick={() => setIsRevisionModalOpen(false)}>Cancel</button>
          <button className="prime-button" disabled={isSubmittingRevision || !revisionReason.trim()} onClick={handleReject}>
            {isSubmittingRevision && <Loader2 size={16} className="animate-spin" />}Send revision request
          </button>
        </>}>
        <p className="text-sm mb-5">Explain what needs to change on request #{activeRequest?.taskId}. The requestor will receive your feedback and an edit link.</p>
        <label htmlFor="revision-reason" className="prime-label text-xs block mb-2">Revision instructions</label>
        <textarea id="revision-reason" rows={5} value={revisionReason} onChange={event => setRevisionReason(event.target.value)} className="prime-field" />
      </PrimeDialog>
      <SignatureModal
        isOpen={isSignatureModalOpen}
        onClose={() => setIsSignatureModalOpen(false)}
        currentSignature={approverSignature}
        title="Add TL / approver signature"
        onSave={(dataUrl) => setApproverSignature(dataUrl)}
      />
    </div>
  );
}

export default function ApprovalsPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-6xl mx-auto px-4 py-12 text-center text-xs font-medium text-prime-ink">
          Loading Approvals Portal...
        </div>
      }
    >
      <ApprovalsContent />
    </Suspense>
  );
}
