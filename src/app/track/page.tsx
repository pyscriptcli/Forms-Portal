"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { useSearchParams } from "next/navigation";
import {
  Search,
  Mail,
  Building2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Paperclip,
  ExternalLink,
  Edit3,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { TrackedRfp } from "../api/rfp/track/route";
import { DEPARTMENT_NAMES } from "@/types/rfp";

const DEPARTMENTS = ["All Departments", ...DEPARTMENT_NAMES];

const STAGES = [
  { label: "Submitted", desc: "Pending Endorsement" },
  { label: "Endorsed", desc: "TL / Dept Head Approved" },
  { label: "Finance Verification", desc: "Zoho & Top Sheet Prepared" },
  { label: "Disbursement Prep", desc: "UnionBank / Check Prepared" },
  { label: "Executive Sign-Off", desc: "CFO & CEO Signed Off" },
  { label: "Completed", desc: "Payment Released & Filed" },
];

function TrackContent() {
  const searchParams = useSearchParams();
  const initialId = searchParams.get("id") || "";

  const [searchQuery, setSearchQuery] = useState(initialId);
  const [emailFilter, setEmailFilter] = useState("");
  const [selectedDept, setSelectedDept] = useState("All Departments");
  const [requests, setRequests] = useState<TrackedRfp[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg("");

    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) {
        if (/^\d{8,}/.test(searchQuery.trim()) || searchQuery.trim().length === 11) {
          params.append("id", searchQuery.trim());
        } else {
          params.append("query", searchQuery.trim());
        }
      }
      if (emailFilter.trim()) params.append("email", emailFilter.trim());
      if (selectedDept !== "All Departments") params.append("dept", selectedDept);

      const res = await fetch(`/api/rfp/track?${params.toString()}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to load requests");
      }

      setRequests(data.requests || []);
    } catch (err: any) {
      setErrorMsg(err.message || "Unable to reach tracking service");
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, emailFilter, selectedDept]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchRequests();
  };

  return (
    <div className="prime-page">
      <PageHeader title="Request status" description="Follow each request from submission to payment." actions={
        <button type="button" className="prime-button secondary" onClick={fetchRequests} disabled={isLoading}>
          <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} /> Refresh
        </button>
      } />
      <div className="prime-panel mb-6">
        {/* Search & Filters */}
        <form onSubmit={handleSearchSubmit} className="mt-6 grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Tracking Code / Payee Search */}
          <div className="sm:col-span-5 relative">
            <Search className="w-4 h-4 text-prime-ink absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by Tracking ID / Task # / Payee..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-prime-white border border-prime-rule focus:border-prime-blue text-xs pl-9 pr-3 h-9 focus:outline-none transition-colors"
            />
          </div>

          {/* Work Email Lookup */}
          <div className="sm:col-span-4 relative">
            <Mail className="w-4 h-4 text-prime-ink absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Enter work email (e.g. dave@...)"
              value={emailFilter}
              onChange={(e) => setEmailFilter(e.target.value)}
              className="w-full bg-prime-white border border-prime-rule focus:border-prime-blue text-xs pl-9 pr-3 h-9 focus:outline-none transition-colors"
            />
          </div>

          {/* Department Filter */}
          <div className="sm:col-span-3 relative">
            <Building2 className="w-4 h-4 text-prime-ink absolute left-3 top-2.5 pointer-events-none" />
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full bg-prime-white border border-prime-rule focus:border-prime-blue text-xs pl-9 pr-3 h-9 focus:outline-none transition-colors cursor-pointer"
            >
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>
        </form>
      </div>

      {/* Results Section */}
      {isLoading ? (
        <div className="bg-prime-white border border-prime-rule p-12 text-center">
          <Loader2 className="w-6 h-6 animate-spin text-prime-blue mx-auto mb-2" />
          <p className="text-xs font-medium text-prime-ink">Checking live status in ClickUp...</p>
        </div>
      ) : errorMsg ? (
        <div className="bg-prime-white border border-prime-rule p-6 text-center text-prime-blue text-xs">
          <p className="font-medium mb-1">Failed to load requests</p>
          <p>{errorMsg}</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-prime-white border border-prime-rule p-12 text-center shadow-none">
          <div className="w-12 h-12 bg-prime-white rounded-none flex items-center justify-center mx-auto mb-3 text-prime-ink">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="font-serif italic font-medium text-lg text-prime-ink">No requests found</h3>
          <p className="text-xs text-prime-ink mt-1 max-w-sm mx-auto">
            Try adjusting your search by Task ID, Payee, or Work Email, or submit a new payment request.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 mt-4 h-8 px-4 text-xs font-medium text-prime-white bg-prime-blue hover:bg-prime-blue transition-colors shadow-none"
          >
            <span>Fill Up New RFP</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {requests.map((req) => {
            const formattedTotal = Number(req.totalAmount || 0).toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            });

            return (
              <div
                key={req.taskId}
                className={`bg-prime-white border ${
                  req.isRevisionRequested
                    ? "border-prime-rule ring-1 ring-prime-rule"
                    : req.currentStage === "completed"
                    ? "border-prime-rule"
                    : "border-prime-rule"
                } shadow-none p-6 relative`}
              >
                {/* Revision Alert Header */}
                {req.isRevisionRequested && (
                  <div className="mb-5 bg-prime-white border border-prime-rule p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle className="w-4 h-4 text-prime-blue shrink-0 mt-0.5" />
                      <div>
                        <span className="text-xs font-medium text-prime-blue uppercase tracking-wide block">
                          Revision Requested by {req.revisionBy === "finance" ? "Finance & Accounting" : "Team Leader"}
                        </span>
                        <span className="text-xs text-prime-blue mt-0.5 block italic">
                          {req.revisionReason ? `"${req.revisionReason}"` : "Please review comments and update form details."}
                        </span>
                      </div>
                    </div>
                    <Link
                      href={`/?taskId=${req.taskId}`}
                      className="h-8 px-3.5 bg-prime-blue hover:bg-prime-blue text-prime-white text-xs font-medium flex items-center gap-1.5 transition-colors shrink-0 self-start sm:self-auto"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit & Resubmit</span>
                    </Link>
                  </div>
                )}

                {/* Top Info Row */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-prime-rule pb-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-sans tabular-nums text-xs font-medium text-prime-blue bg-prime-white px-2 py-0.5 border border-prime-rule">
                        #{req.taskId}
                      </span>
                      <span className="text-[11px] font-medium uppercase tracking-wider px-2 py-0.5 bg-prime-blue text-prime-white">
                        {req.formType ? req.formType.toUpperCase() : "RFP"}
                      </span>
                      <span className="text-xs font-medium text-prime-ink uppercase bg-prime-white px-2 py-0.5">
                        {req.department}
                      </span>
                      {req.urgency === "urgent" && (
                        <span className="text-[11px] font-medium text-prime-blue bg-prime-white border border-prime-rule px-2 py-0.5">
                          🚨 URGENT
                        </span>
                      )}
                      <span className="text-[11px] text-prime-ink">
                        Submitted: {new Date(req.dateCreated).toLocaleDateString()}
                      </span>
                    </div>

                    <h2 className="text-base sm:text-lg font-medium text-prime-ink tracking-tight mt-1">
                      {req.payee}
                    </h2>
                    <p className="text-xs text-prime-ink mt-1 line-clamp-2">
                      <span className="font-medium text-prime-ink">Purpose:</span>{" "}
                      {req.purpose || "Payment for approved business requirements."}
                    </p>
                  </div>

                  <div className="text-left sm:text-right shrink-0">
                    <span className="text-[11px] uppercase font-medium text-prime-ink block tracking-wider">
                      TOTAL AMOUNT
                    </span>
                    <span className="font-bebas text-2xl text-prime-blue tracking-wider block">
                      ₱{formattedTotal}
                    </span>
                    <span className="text-[11px] text-prime-ink block">
                      Needed by: <strong className="text-prime-ink">{req.dateNeeded || "N/A"}</strong>
                    </span>
                  </div>
                </div>

                {/* E-Commerce 6-Stage Stepper */}
                <div className="py-6 border-b border-prime-rule">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 relative">
                    {STAGES.map((stage, idx) => {
                      const isComplete = req.stageIndex > idx;
                      const isCurrent = req.stageIndex === idx;

                      let badgeColor = "bg-prime-white text-prime-ink border-prime-rule";
                      let textColor = "text-prime-ink";

                      if (isComplete) {
                        badgeColor = "bg-prime-blue text-prime-white border-prime-blue shadow-none";
                        textColor = "text-prime-blue font-medium";
                      } else if (isCurrent) {
                        if (req.isRevisionRequested) {
                          badgeColor = "bg-prime-blue text-prime-white border-prime-blue shadow-none animate-pulse";
                          textColor = "text-prime-blue font-medium";
                        } else {
                          badgeColor = "bg-prime-blue text-prime-white border-prime-blue shadow-none";
                          textColor = "text-prime-blue font-medium";
                        }
                      }

                      return (
                        <div key={stage.label} className="flex flex-col items-center text-center relative px-1">
                          <div
                            className={`w-7 h-7 rounded-none flex items-center justify-center border text-xs font-medium mb-2 transition-all ${badgeColor}`}
                          >
                            {isComplete ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                          </div>
                          <span className={`text-[11px] sm:text-xs font-medium leading-tight block ${textColor}`}>
                            {stage.label}
                          </span>
                          <span className="text-[11px] text-prime-ink block mt-0.5 leading-tight">
                            {stage.desc}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Bottom Footer: Requestor & Attachments */}
                <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-prime-ink">
                  <div>
                    <span>Requested by: </span>
                    <strong className="text-prime-ink">{req.requestedBy}</strong>
                  </div>

                  {/* Attached files preview */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {req.attachments.length > 0 ? (
                      req.attachments.map((att, attIdx) => (
                        <a
                          key={att.id || attIdx}
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-1 bg-prime-white hover:bg-prime-white border border-prime-rule text-prime-ink text-[11px] font-medium transition-colors"
                        >
                          <Paperclip className="w-3 h-3 text-prime-ink" />
                          <span className="truncate max-w-[120px]">{att.name}</span>
                        </a>
                      ))
                    ) : (
                      <span className="text-prime-ink italic">Official RFP PDF generated in ClickUp</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function TrackPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-5xl mx-auto px-4 py-12 text-center text-xs font-medium text-prime-ink">
          Loading Request Tracker...
        </div>
      }
    >
      <TrackContent />
    </Suspense>
  );
}
