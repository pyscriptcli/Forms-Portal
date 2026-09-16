"use client";

import React, { useState } from "react";
import { UserRole } from "@/lib/rbac";
import {
  ShieldCheck,
  User,
  Briefcase,
  HelpCircle,
  X,
  ExternalLink,
  CheckCircle2,
  Clock,
  ArrowRight,
  Lock,
  Layers,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

interface PrototypeRoleSwitcherProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  assignedApproverName?: string;
  assignedApproverEmail?: string;
  department?: string;
}

export function PrototypeRoleSwitcher({
  currentRole,
  onRoleChange,
  assignedApproverName,
  assignedApproverEmail,
  department,
}: PrototypeRoleSwitcherProps) {
  const [isFinanceModalOpen, setIsFinanceModalOpen] = useState(false);
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);

  const handleRoleSelect = (role: UserRole) => {
    onRoleChange(role);
    if (role === "finance") {
      setIsFinanceModalOpen(true);
    }
  };

  return (
    <>
      {/* Simulation Top Bar */}
      <aside
        aria-label="Prototype Role Simulator"
        className="mb-4 bg-gradient-to-r from-slate-900 via-[#002244] to-slate-900 text-white rounded-lg p-3 sm:p-4 shadow-md border border-slate-700/60 print:hidden no-print"
        data-pdf-ignore="true"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Title & Context */}
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 bg-amber-400/20 text-amber-300 rounded border border-amber-400/30">
              <Sparkles size={16} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold tracking-wider uppercase bg-amber-400 text-slate-950 px-1.5 py-0.5 rounded text-[10px]">
                  Prototype Demo Mode
                </span>
                <span className="text-xs font-semibold text-slate-200">
                  Role Simulator
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-tight mt-0.5">
                Switch views to demonstrate the RFP lifecycle to stakeholders:
              </p>
            </div>
          </div>

          {/* Role Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-800/80 p-1 rounded-lg border border-slate-700">
            {/* Requestor View */}
            <button
              type="button"
              onClick={() => handleRoleSelect("requestor")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                currentRole === "requestor"
                  ? "bg-[#003366] text-white shadow border border-blue-400/40"
                  : "text-slate-300 hover:text-white hover:bg-slate-700/60"
              }`}
            >
              <User size={13} />
              <span>Requestor View</span>
            </button>

            {/* Approver View */}
            <button
              type="button"
              onClick={() => handleRoleSelect("approver")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                currentRole === "approver"
                  ? "bg-[#5E3BEE] text-white shadow border border-purple-400/40"
                  : "text-slate-300 hover:text-white hover:bg-slate-700/60"
              }`}
            >
              <ShieldCheck size={13} />
              <span>Approver View (TL)</span>
            </button>

            {/* Finance View (ClickUp Only) */}
            <button
              type="button"
              onClick={() => handleRoleSelect("finance")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                currentRole === "finance"
                  ? "bg-[#134438] text-white shadow border border-emerald-400/40"
                  : "text-slate-300 hover:text-white hover:bg-slate-700/60"
              }`}
            >
              <Briefcase size={13} />
              <span>Finance View (ClickUp Only)</span>
            </button>

            {/* Help Button: How Approvers Are Assigned */}
            <button
              type="button"
              onClick={() => setIsAssignmentModalOpen(true)}
              title="How do I assign that to the approver account?"
              className="p-1.5 text-slate-400 hover:text-amber-300 hover:bg-slate-700/60 rounded-md transition"
            >
              <HelpCircle size={15} />
            </button>
          </div>
        </div>

        {/* Dynamic Context Helper Banner */}
        <div className="mt-2.5 pt-2 border-t border-slate-700/60 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-300">
          <div>
            {currentRole === "requestor" && (
              <span className="flex items-center gap-1.5">
                <Lock size={12} className="text-amber-300" />
                <span>
                  <strong>Requestor View Active:</strong> Staff can create and submit requests. Section 8 TL signature is locked under <em>&quot;For TL / Approver Only&quot;</em>.
                </span>
              </span>
            )}
            {currentRole === "approver" && (
              <span className="flex items-center gap-1.5 text-purple-200">
                <ShieldCheck size={13} className="text-purple-300" />
                <span>
                  <strong>Approver View Active:</strong> Section 8 TL Signature is unlocked. You can sign as Team Leader or quick-fill demo signature.
                </span>
              </span>
            )}
            {currentRole === "finance" && (
              <span className="flex items-center gap-1.5 text-emerald-200">
                <Briefcase size={13} className="text-emerald-300" />
                <span>
                  <strong>Finance Mode:</strong> Finance operates natively inside ClickUp to process vouchers, check compliance, and release payments.
                </span>
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsAssignmentModalOpen(true)}
            className="text-amber-300 hover:text-amber-200 hover:underline flex items-center gap-1 text-[11px] font-medium"
          >
            <span>How Approver Accounts Are Assigned</span>
            <ArrowRight size={11} />
          </button>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 1. FINANCE CLICKUP WORKFLOW SIMULATION MODAL */}
      {/* ========================================================================= */}
      {isFinanceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in print:hidden no-print">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full border border-slate-300 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-[#134438] text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-700/60 rounded-lg">
                  <Briefcase size={20} className="text-emerald-200" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base">Finance View: Native ClickUp Workflow</h3>
                    <span className="bg-emerald-800 text-emerald-100 text-[10px] font-semibold px-2 py-0.5 rounded uppercase tracking-wider">
                      ClickUp SSOT
                    </span>
                  </div>
                  <p className="text-xs text-emerald-200 mt-0.5">
                    Why Finance operates in ClickUp and how changes sync to the Portal
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFinanceModalOpen(false)}
                className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-emerald-800 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs text-slate-700">
              {/* Core Principle Callout */}
              <div className="bg-emerald-50 border-l-4 border-[#134438] p-3 rounded-r">
                <h4 className="font-bold text-[#134438] text-xs mb-1">
                  Architecture Rule: Finance Works Directly in ClickUp
                </h4>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  Finance &amp; Accounting officers do not need a separate portal login. They process RFPs directly within the centralized ClickUp Space where accounting queues, voucher numbers, SLA alerts, and bank release schedules already live.
                </p>
              </div>

              {/* Simulated ClickUp Board View */}
              <div>
                <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-1.5 text-xs">
                  <Layers size={14} className="text-[#003366]" />
                  <span>Simulated ClickUp Status Workflow &amp; Milestones:</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Card 1: Completed TL Review */}
                  <div className="border border-slate-200 rounded-lg p-2.5 bg-slate-50">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide">
                        1. TL Review
                      </span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-semibold flex items-center gap-0.5">
                        <CheckCircle2 size={10} /> Done
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Team Leader endorsed in portal. ClickUp status advanced to <strong>Finance Validation</strong>.
                    </p>
                    <div className="mt-2 text-[10px] text-slate-500 font-mono bg-white p-1 rounded border border-slate-100">
                      TS - TL Review: Sep 16, 3:43 PM
                    </div>
                  </div>

                  {/* Card 2: Finance Validation (Active) */}
                  <div className="border-2 border-emerald-500 rounded-lg p-2.5 bg-emerald-50/40 relative shadow-xs">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold text-[#134438] uppercase tracking-wide">
                        2. Finance Validation
                      </span>
                      <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.2 rounded font-semibold flex items-center gap-0.5 animate-pulse">
                        <Clock size={10} /> Active
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-700">
                      Finance verifies Section 9 checklist, tax invoices, and supporting quotes directly in ClickUp.
                    </p>
                    <div className="mt-2 text-[10px] text-emerald-900 font-mono bg-white p-1 rounded border border-emerald-200">
                      Queue #: Q-2026-0891
                    </div>
                  </div>

                  {/* Card 3: Payment Release */}
                  <div className="border border-slate-200 rounded-lg p-2.5 bg-slate-50">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">
                        3. Payment Release
                      </span>
                      <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-semibold">
                        Queued
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Check or bank transfer dispatched. Dragging to <em>Payment Release</em> sets the final timestamp.
                    </p>
                    <div className="mt-2 text-[10px] text-slate-500 font-mono bg-white p-1 rounded border border-slate-100">
                      TS - Payment Release
                    </div>
                  </div>
                </div>
              </div>

              {/* Real-Time Sync Explanation */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
                <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <Sparkles size={14} className="text-amber-600" />
                  <span>How ClickUp Updates the Requestor Portal in Real Time:</span>
                </h4>
                <ul className="space-y-1.5 text-[11px] text-slate-600 list-disc list-inside">
                  <li>
                    When Finance updates status in ClickUp, ClickUp&apos;s webhook calls <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800">/api/clickup/webhook</code>.
                  </li>
                  <li>
                    The milestone timestamp field (e.g. <em>RFP TS - Finance Validation</em>) is automatically written to ClickUp.
                  </li>
                  <li>
                    The Requestor checking the tracking portal at <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800">/requests</code> sees the green checkmark and the exact timestamp immediately!
                  </li>
                </ul>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="bg-slate-100 p-3.5 border-t border-slate-200 flex items-center justify-between gap-3">
              <Link
                href="/requests"
                target="_blank"
                className="inline-flex items-center gap-1.5 text-xs text-[#003366] font-semibold hover:underline"
              >
                <span>View Requestor Tracking Timeline</span>
                <ExternalLink size={13} />
              </Link>

              <button
                type="button"
                onClick={() => setIsFinanceModalOpen(false)}
                className="px-4 py-1.5 bg-[#134438] hover:bg-[#0e3027] text-white text-xs font-semibold rounded shadow transition"
              >
                Got It / Back to Form
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. HOW APPROVER ACCOUNTS ARE ASSIGNED MODAL */}
      {/* ========================================================================= */}
      {isAssignmentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in print:hidden no-print">
          <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full border border-slate-300 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="bg-[#003366] text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck size={20} className="text-amber-300" />
                <div>
                  <h3 className="font-bold text-base">How Approver Accounts Are Assigned</h3>
                  <p className="text-xs text-blue-200 mt-0.5">
                    Assigning Team Leaders to Department Submissions
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAssignmentModalOpen(false)}
                className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-blue-900 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs text-slate-700">
              {/* Current Assigned Approver Preview if department is selected */}
              {department && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wide block mb-1">
                    Currently Resolved Approver for {department}:
                  </span>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-900">
                        {assignedApproverName || "Department Team Leader"}
                      </p>
                      <p className="text-[11px] text-slate-600">
                        {assignedApproverEmail || "tl.lead@primephilippines.com"}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 bg-blue-600 text-white rounded text-[10px] font-semibold">
                      Approver Role
                    </span>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {/* Step 1: Department RBAC Mapping */}
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#003366] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs">
                      Portal RBAC Assignment (/admin)
                    </h4>
                    <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                      In the <strong>/admin</strong> dashboard under the <strong>RBAC</strong> tab, users are designated as <code>Approver / Team Leader</code> and mapped to their Department (e.g. ISD, Operations, Marketing).
                    </p>
                  </div>
                </div>

                {/* Step 2: Automatic Form Linking */}
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#003366] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs">
                      Automatic Department Lookup on Form
                    </h4>
                    <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                      When the requestor selects their department, the system auto-resolves that department&apos;s Team Leader and writes their name and email to ClickUp custom fields: <code>RFP Approver Name</code> and <code>RFP Approver Email</code>.
                    </p>
                  </div>
                </div>

                {/* Step 3: ClickUp Task Assignee & Notification */}
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#003366] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs">
                      ClickUp Notification &amp; Endorsement
                    </h4>
                    <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                      The approver receives a ClickUp task notification and an email with a direct link to the <strong>/approvals</strong> portal, where they review the attached quote, check the PDF, and sign to endorse.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-100 p-3.5 border-t border-slate-200 flex items-center justify-between">
              <Link
                href="/admin"
                target="_blank"
                className="inline-flex items-center gap-1.5 text-xs text-[#003366] font-semibold hover:underline"
              >
                <span>Manage Users in Admin RBAC</span>
                <ExternalLink size={13} />
              </Link>
              <button
                type="button"
                onClick={() => setIsAssignmentModalOpen(false)}
                className="px-4 py-1.5 bg-[#003366] hover:bg-[#002244] text-white text-xs font-semibold rounded shadow transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
