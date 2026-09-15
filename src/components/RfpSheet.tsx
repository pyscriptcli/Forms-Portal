"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { RfpFormData, RfpLineItem } from "@/types/rfp";
import { PrimeCheckbox } from "./PrimeCheckbox";
import { AutoResizeTextarea } from "./AutoResizeTextarea";
import { SignatureModal } from "./SignatureModal";
import { PrimeDatePicker } from "./PrimeDatePicker";
import { PenTool, Trash2, Plus, Check } from "lucide-react";

interface RfpSheetProps {
  data: RfpFormData;
  onChange: (data: RfpFormData) => void;
  validationErrors?: Record<string, string>;
}

export function RfpSheet({ data, onChange, validationErrors }: RfpSheetProps) {
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [isTlSignatureModalOpen, setIsTlSignatureModalOpen] = useState(false);

  // Auto-fill time on load if not set
  useEffect(() => {
    if (!data.time) {
      const now = new Date();
      const defaultTime = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      onChange({ ...data, time: defaultTime });
    }
  }, []);

  const hasError = (key: string) => Boolean(validationErrors?.[key]);

  const updateField = <K extends keyof RfpFormData>(field: K, value: RfpFormData[K]) => {
    onChange({ ...data, [field]: value });
  };

  const updateAttachedDocs = (key: string, val: any) => {
    const prev = data.attachedDocs || {};
    onChange({
      ...data,
      attachedDocs: {
        ...prev,
        [key]: val,
      },
    });
  };

  // Line item handlers
  const handleItemChange = (index: number, key: keyof RfpLineItem, val: any) => {
    const updatedItems = [...data.items];
    const current = { ...updatedItems[index], [key]: val };

    const qtyNum = typeof current.qty === "number" ? current.qty : parseFloat(String(current.qty)) || 0;
    const priceNum = typeof current.unitPrice === "number" ? current.unitPrice : parseFloat(String(current.unitPrice)) || 0;
    current.amount = qtyNum * priceNum;

    updatedItems[index] = current;

    const newTotal = updatedItems.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
    onChange({
      ...data,
      items: updatedItems,
      totalAmount: newTotal,
    });
  };

  const addItemRow = () => {
    const newItem: RfpLineItem = {
      id: Math.random().toString(36).substring(2, 9),
      description: "",
      qty: "",
      unit: "pcs",
      unitPrice: "",
      amount: 0,
    };
    onChange({
      ...data,
      items: [...data.items, newItem],
    });
  };

  const removeItemRow = (index: number) => {
    if (data.items.length <= 1) return;
    const updated = data.items.filter((_, i) => i !== index);
    const newTotal = updated.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
    onChange({
      ...data,
      items: updated,
      totalAmount: newTotal,
    });
  };

  const formatCurrency = (val: number) => {
    return Number(val || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const attached = data.attachedDocs || {};

  return (
    <div
      id="rfp-printable-sheet"
      className="bg-white text-[#111111] w-full max-w-[850px] mx-auto p-5 sm:p-7 border border-[#d7d7d7] shadow-md rfp-sheet text-xs select-text print:p-0 print:border-none print:shadow-none"
      style={{ fontFamily: '"Times New Roman", Times, Georgia, serif' }}
    >
      {/* ========================================================================= */}
      {/* HEADER AREA */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-2">
        {/* Left: PRIME Logo */}
        <div className="shrink-0 flex items-center">
          <Image src="/prime-blue-logo.png" alt="PRIME Philippines" width={220} height={60} unoptimized className="h-11 w-auto object-contain" priority />
        </div>

        {/* Center: Official Title Box with soft PRIME blue background */}
        <div className="flex-1 w-full sm:w-auto bg-[#e6ecfe] py-2 px-3 text-center border border-[#c7d8ea]">
          <h1 className="font-bold text-base sm:text-lg tracking-wide text-[#003366] uppercase">
            REQUEST FOR PAYMENT (RFP)
          </h1>
          <p className="font-bold text-[9px] sm:text-[10px] tracking-wider text-[#002B49] uppercase mt-0.5">
            PROPERTY INTERACTIVE MARKETING ENTERPRISE REALTY CORP.
          </p>
        </div>
      </div>

      {/* Right-aligned RFP Document Code */}
      <div className="flex justify-end items-baseline gap-1 mb-2.5 text-xs font-bold text-[#002B49]">
        <span>RFP-</span>
        <input
          type="text"
          value={data.rfpCodeSuffix ?? "0000001"}
          onChange={(e) => updateField("rfpCodeSuffix", e.target.value)}
          placeholder="0000001"
          className="border-b border-[#002B49] bg-transparent focus:outline-none w-28 text-xs font-bold text-[#002B49]"
        />
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: TIMING OF SUBMISSION */}
      {/* ========================================================================= */}
      <div className="mb-3">
        <div className="bg-[#e6ecfe] px-2.5 py-1 text-[11px] font-bold text-[#003366] uppercase tracking-wide">
          TIMING OF SUBMISSION
        </div>
        <div className="py-2 px-1">
          {/* Row 1: Dates & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-2">
            <div className="flex items-baseline gap-1">
              <span className="font-bold text-[11px] text-[#0f172a] whitespace-nowrap">
                Date Accomplished (MM/DD/YYYY):
              </span>
              <PrimeDatePicker
                value={data.dateAccomplished ?? data.date}
                onChange={(val) => {
                  updateField("dateAccomplished", val);
                  updateField("date", val);
                }}
                hasError={hasError("date")}
                className="flex-1 min-w-[70px]"
              />
            </div>

            <div className="flex items-baseline gap-1">
              <span className="font-bold text-[11px] text-[#0f172a] whitespace-nowrap">
                Due Date (MM/DD/YYYY):
              </span>
              <PrimeDatePicker
                value={data.dueDate ?? data.dateNeeded ?? ""}
                onChange={(val) => {
                  updateField("dueDate", val);
                  updateField("dateNeeded", val);
                }}
                className="flex-1 min-w-[70px]"
              />
            </div>

            <div className="flex items-baseline gap-1">
              <span className="font-bold text-[11px] text-[#0f172a] whitespace-nowrap">
                Time:
              </span>
              <input
                type="text"
                value={data.time ?? ""}
                onChange={(e) => updateField("time", e.target.value)}
                placeholder=""
                className="border-b border-[#0f172a] bg-transparent focus:outline-none flex-1 min-w-[50px] text-xs px-1"
              />
            </div>
          </div>

          {/* Row 2: Checkboxes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 pt-0.5">
            <div className="space-y-1">
              <PrimeCheckbox
                checked={data.isUrgentPayment === "yes" || data.urgency === "urgent"}
                onChange={(c) => {
                  updateField("isUrgentPayment", c ? "yes" : "");
                  updateField("urgency", c ? "urgent" : "not_urgent");
                }}
                label={<span className="font-medium">Urgent for Payment — Yes</span>}
              />
              <div>
                <PrimeCheckbox
                  checked={data.isUrgentPayment === "no" || data.urgency === "not_urgent"}
                  onChange={(c) => {
                    updateField("isUrgentPayment", c ? "no" : "");
                    updateField("urgency", c ? "not_urgent" : "");
                  }}
                  label={<span className="font-medium">No</span>}
                />
              </div>
            </div>

            <div className="space-y-1">
              <PrimeCheckbox
                checked={data.budgetStatus === "within_budget"}
                onChange={(c) => updateField("budgetStatus", c ? "within_budget" : "")}
                label={<span className="font-medium">Within Budget</span>}
              />
              <div>
                <PrimeCheckbox
                  checked={data.budgetStatus === "exceeds_budget"}
                  onChange={(c) => updateField("budgetStatus", c ? "exceeds_budget" : "")}
                  label={<span className="font-medium">Exceeds Budget</span>}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 2: URGENT REQUEST DETAILS */}
      {/* ========================================================================= */}
      <div className="mb-3">
        <div className="bg-[#e6ecfe] px-2.5 py-1 text-[11px] font-bold text-[#003366] tracking-wide">
          <span className="uppercase">URGENT REQUEST DETAILS</span>{" "}
          <span className="italic font-normal text-[10px] text-[#002B49]">
            (complete only if Urgent for Payment)
          </span>
        </div>
        <div className="py-2 px-1">
          {/* Required Payment Date line */}
          <div className="flex items-baseline gap-1.5 mb-2.5">
            <span className="font-bold text-[11px] text-[#0f172a] whitespace-nowrap">
              Required Payment Date (MM/DD/YYYY):
            </span>
            <PrimeDatePicker
              value={data.requiredPaymentDate ?? ""}
              onChange={(val) => updateField("requiredPaymentDate", val)}
              className="w-44"
            />
          </div>

          {/* Two rounded boxes: Reason for Urgency & Impact if Delayed */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="border border-[#334155] rounded-xl p-2.5 bg-white flex flex-col justify-start">
              <span className="font-bold text-[11px] text-[#0f172a] mb-1">
                Reason for Urgency:
              </span>
              <AutoResizeTextarea
                value={data.reasonForUrgency ?? ""}
                onChange={(e) => updateField("reasonForUrgency", e.target.value)}
                minHeight={48}
                rows={2}
                placeholder=""
                className="text-xs text-[#0f172a] p-1 bg-transparent focus:outline-none"
              />
            </div>

            <div className="border border-[#334155] rounded-xl p-2.5 bg-white flex flex-col justify-start">
              <span className="font-bold text-[11px] text-[#0f172a] mb-1">
                Impact if Delayed:
              </span>
              <AutoResizeTextarea
                value={data.impactIfDelayed ?? ""}
                onChange={(e) => updateField("impactIfDelayed", e.target.value)}
                minHeight={48}
                rows={2}
                placeholder=""
                className="text-xs text-[#0f172a] p-1 bg-transparent focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 3: VENDOR */}
      {/* ========================================================================= */}
      <div className="mb-3">
        <div className="bg-[#e6ecfe] px-2.5 py-1 text-[11px] font-bold text-[#003366] uppercase tracking-wide">
          VENDOR
        </div>
        <div className="py-2 px-1 flex items-baseline gap-2">
          <span className="font-bold text-[11px] text-[#0f172a] whitespace-nowrap">
            Vendor:
          </span>
          <input
            id="rfp-field-payee"
            type="text"
            value={data.vendor ?? data.payee}
            onChange={(e) => {
              updateField("vendor", e.target.value);
              updateField("payee", e.target.value);
            }}
            placeholder=""
            className={`border-b border-[#0f172a] bg-transparent focus:outline-none flex-1 text-xs px-1 font-medium ${
              hasError("payee") ? "border-red-500 bg-red-50/50" : ""
            }`}
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 4: ITEMIZED TABLE & CURRENCY */}
      {/* ========================================================================= */}
      <div className="mb-3">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-[#334155] text-xs">
            <thead>
              <tr className="bg-[#e6ecfe] text-[#333333] font-bold text-[11px]">
                <th className="border border-[#334155] px-2 py-1 text-center font-bold">
                  Item / Description
                </th>
                <th className="border border-[#334155] px-2 py-1 text-center font-bold w-28">
                  Unit Price
                </th>
                <th className="border border-[#334155] px-2 py-1 text-center font-bold w-24">
                  Quantity
                </th>
                <th className="border border-[#334155] px-2 py-1 text-center font-bold w-32">
                  Amount
                </th>
                <th className="border border-[#334155] px-1 py-1 w-7 print:hidden text-center"></th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, index) => (
                <tr key={item.id} className="hover:bg-slate-50/50">
                  <td className="border border-[#334155] px-2 py-1 align-top">
                    <AutoResizeTextarea
                      value={item.description}
                      onChange={(e) => handleItemChange(index, "description", e.target.value)}
                      minHeight={22}
                      rows={1}
                      placeholder=""
                      className="text-xs text-[#0f172a] p-0.5"
                    />
                  </td>
                  <td className="border border-[#334155] px-2 py-1 align-top">
                    <input
                      type="number"
                      value={item.unitPrice === "" ? "" : item.unitPrice}
                      onChange={(e) => handleItemChange(index, "unitPrice", e.target.value)}
                      placeholder=""
                      className="w-full text-right bg-transparent focus:outline-none text-xs p-0.5"
                    />
                  </td>
                  <td className="border border-[#334155] px-2 py-1 align-top">
                    <input
                      type="number"
                      value={item.qty === "" ? "" : item.qty}
                      onChange={(e) => handleItemChange(index, "qty", e.target.value)}
                      placeholder=""
                      className="w-full text-center bg-transparent focus:outline-none text-xs p-0.5"
                    />
                  </td>
                  <td className="border border-[#334155] px-2 py-1 align-top text-right font-medium">
                    {formatCurrency(item.amount)}
                  </td>
                  <td className="border border-[#334155] p-1 text-center print:hidden align-middle">
                    {data.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItemRow(index)}
                        className="text-red-400 hover:text-red-600 transition-colors p-0.5"
                        title="Remove row"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}

              {/* Total Row */}
              <tr>
                <td colSpan={3} className="border border-[#334155] px-3 py-1.5 text-right font-bold text-xs text-[#002B49]">
                  Total Price for Payment:
                </td>
                <td className="border border-[#334155] px-2 py-1.5 text-right font-bold text-xs text-[#002B49]">
                  {formatCurrency(data.totalAmount)}
                </td>
                <td className="border border-[#334155] print:hidden"></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Add Row Button (Screen only) */}
        <div className="mt-1 flex justify-between items-center print:hidden">
          <button
            type="button"
            onClick={addItemRow}
            className="text-[11px] text-[#003366] hover:text-[#002244] font-medium flex items-center gap-1 py-1"
          >
            <Plus size={12} /> Add Item Row
          </button>
        </div>

        {/* Currency row */}
        <div className="flex items-center gap-6 mt-2 px-1">
          <span className="font-bold text-[11px] text-[#0f172a]">Currency:</span>
          <div className="flex items-center gap-6">
            <PrimeCheckbox
              checked={data.currencyType === "PHP" || !data.currencyType}
              onChange={() => updateField("currencyType", "PHP")}
              label={<span className="font-medium">PHP</span>}
            />
            <div className="flex items-center gap-1.5">
              <PrimeCheckbox
                checked={data.currencyType === "other"}
                onChange={(c) => updateField("currencyType", c ? "other" : "PHP")}
                label={<span className="font-medium">Other (Specify):</span>}
              />
              <input
                type="text"
                value={data.currencyOther ?? ""}
                onChange={(e) => updateField("currencyOther", e.target.value)}
                disabled={data.currencyType !== "other"}
                className="border-b border-[#0f172a] bg-transparent focus:outline-none w-32 text-xs px-1 disabled:opacity-40"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 5: PURPOSE OF REQUEST / BUSINESS JUSTIFICATION */}
      {/* ========================================================================= */}
      <div className="mb-3">
        <div className="bg-[#e6ecfe] px-2.5 py-1 text-[11px] font-bold text-[#003366] uppercase tracking-wide">
          PURPOSE OF REQUEST / BUSINESS JUSTIFICATION
        </div>
        <div className="py-2 px-1">
          <AutoResizeTextarea
            id="rfp-field-purpose"
            value={data.purpose}
            onChange={(e) => updateField("purpose", e.target.value)}
            minHeight={52}
            rows={2}
            placeholder=""
            className={`w-full text-xs text-[#0f172a] p-1.5 border-b border-[#cbd5e1] focus:border-[#003366] focus:outline-none bg-transparent ${
              hasError("purpose") ? "border-red-500 bg-red-50/50" : ""
            }`}
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 6: SUPPORTING DOCUMENTS ATTACHED */}
      {/* ========================================================================= */}
      <div className="mb-3">
        <div className="bg-[#e6ecfe] px-2.5 py-1 text-[11px] font-bold text-[#003366] uppercase tracking-wide">
          SUPPORTING DOCUMENTS ATTACHED
        </div>
        <div className="py-2 px-1 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
          {/* Left Column */}
          <div className="space-y-1.5">
            <div>
              <PrimeCheckbox
                checked={Boolean(attached.invoiceBilling)}
                onChange={(c) => updateAttachedDocs("invoiceBilling", c)}
                label="Invoice / Billing Statement"
              />
            </div>
            <div>
              <PrimeCheckbox
                checked={Boolean(attached.signedContract)}
                onChange={(c) => updateAttachedDocs("signedContract", c)}
                label="Signed Contract / Agreement"
              />
            </div>
            <div>
              <PrimeCheckbox
                checked={Boolean(attached.liquidationReceipt)}
                onChange={(c) => updateAttachedDocs("liquidationReceipt", c)}
                label="Liquidation / Completion Receipt"
              />
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-1.5">
            <div>
              <PrimeCheckbox
                checked={Boolean(attached.soa)}
                onChange={(c) => updateAttachedDocs("soa", c)}
                label="Statement of Account (SOA)"
              />
            </div>
            <div>
              <PrimeCheckbox
                checked={Boolean(attached.poCostEstimate)}
                onChange={(c) => updateAttachedDocs("poCostEstimate", c)}
                label="Purchase Order / Cost Estimate"
              />
            </div>
            <div className="flex items-baseline gap-1.5">
              <PrimeCheckbox
                checked={Boolean(attached.other)}
                onChange={(c) => updateAttachedDocs("other", c)}
                label="Other (Please specify):"
              />
              <input
                type="text"
                value={attached.otherSpecify ?? ""}
                onChange={(e) => updateAttachedDocs("otherSpecify", e.target.value)}
                disabled={!attached.other}
                className="border-b border-[#0f172a] bg-transparent focus:outline-none flex-1 min-w-[60px] text-xs px-1 disabled:opacity-40"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 7: PAYEE DETAILS & MODE OF PAYMENT */}
      {/* ========================================================================= */}
      <div className="mb-3">
        <div className="bg-[#e6ecfe] px-2.5 py-1 text-[11px] font-bold text-[#003366] uppercase tracking-wide">
          PAYEE DETAILS & MODE OF PAYMENT
        </div>
        <div className="py-2 px-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Left Column: Bank Inputs */}
          <div className="space-y-2">
            <div className="flex items-baseline gap-1.5">
              <span className="font-bold text-[11px] text-[#0f172a] w-28 whitespace-nowrap">
                Bank:
              </span>
              <input
                type="text"
                value={data.bank}
                onChange={(e) => updateField("bank", e.target.value)}
                className="border-b border-[#0f172a] bg-transparent focus:outline-none flex-1 text-xs px-1"
              />
            </div>

            <div className="flex items-baseline gap-1.5">
              <span className="font-bold text-[11px] text-[#0f172a] w-28 whitespace-nowrap">
                Account Name:
              </span>
              <input
                type="text"
                value={data.accountName}
                onChange={(e) => updateField("accountName", e.target.value)}
                className="border-b border-[#0f172a] bg-transparent focus:outline-none flex-1 text-xs px-1"
              />
            </div>

            <div className="flex items-baseline gap-1.5">
              <span className="font-bold text-[11px] text-[#0f172a] w-28 whitespace-nowrap">
                Account Number:
              </span>
              <input
                type="text"
                value={data.accountNumber}
                onChange={(e) => updateField("accountNumber", e.target.value)}
                className="border-b border-[#0f172a] bg-transparent focus:outline-none flex-1 text-xs px-1"
              />
            </div>

            <div className="flex items-baseline gap-1.5">
              <span className="font-bold text-[11px] text-[#0f172a] w-28 whitespace-nowrap">
                Swift Code:
              </span>
              <input
                type="text"
                value={data.swiftCode ?? ""}
                onChange={(e) => updateField("swiftCode", e.target.value)}
                className="border-b border-[#0f172a] bg-transparent focus:outline-none flex-1 text-xs px-1"
              />
            </div>
          </div>

          {/* Right Column: Mode of Payment Checkboxes */}
          <div className="flex flex-col justify-start space-y-2.5 pt-1 sm:pl-4">
            <div>
              <PrimeCheckbox
                checked={data.modeBankTransfer ?? (data.paymentMethod === "online")}
                onChange={(c) => {
                  updateField("modeBankTransfer", c);
                  if (c) updateField("paymentMethod", "online");
                }}
                label="Bank Transfer"
              />
            </div>
            <div>
              <PrimeCheckbox
                checked={data.modeCheck ?? (data.paymentMethod === "check")}
                onChange={(c) => {
                  updateField("modeCheck", c);
                  if (c) updateField("paymentMethod", "check");
                }}
                label="Check"
              />
            </div>
            <div>
              <PrimeCheckbox
                checked={Boolean(data.modeWireTransfer)}
                onChange={(c) => updateField("modeWireTransfer", c)}
                label="Wire Transfer (Other Currency)"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 8: REQUESTOR & AUTHORIZED SIGNATORIES */}
      {/* ========================================================================= */}
      <div className="mb-3">
        <div className="bg-[#e6ecfe] px-2.5 py-1 text-[11px] font-bold text-[#003366] uppercase tracking-wide">
          REQUESTOR & AUTHORIZED SIGNATORIES
        </div>
        <div className="py-2 px-1 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
          {/* Left: Requestor Column */}
          <div className="space-y-2.5">
            <div className="flex items-baseline gap-1.5">
              <span className="font-bold text-[11px] text-[#0f172a] whitespace-nowrap">
                Name:
              </span>
              <input
                type="text"
                value={data.requestedByName}
                onChange={(e) => updateField("requestedByName", e.target.value)}
                className={`border-b border-[#0f172a] bg-transparent focus:outline-none flex-1 text-xs px-1 ${
                  hasError("requestedByName") ? "border-red-500 bg-red-50/50" : ""
                }`}
              />
            </div>

            {/* Signature Area */}
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-[11px] text-[#0f172a] whitespace-nowrap">
                Signature:
              </span>
              <div className="flex-1 flex items-center justify-between border-b border-[#0f172a] pb-0.5">
                {data.signatureDataUrl ? (
                  <div className="flex items-center gap-2">
                    <img
                      src={data.signatureDataUrl}
                      alt="Signature"
                      className="h-8 max-w-[150px] object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => setIsSignatureModalOpen(true)}
                      className="text-[10px] text-[#003366] underline print:hidden"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsSignatureModalOpen(true)}
                    className="text-[11px] text-[#003366] hover:underline flex items-center gap-1 py-1 font-medium print:hidden"
                  >
                    <PenTool size={12} /> Click to Sign
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-baseline gap-1.5">
              <span className="font-bold text-[11px] text-[#0f172a] whitespace-nowrap">
                Date (MM/DD/YYYY):
              </span>
              <PrimeDatePicker
                value={data.requestorDate ?? data.date}
                onChange={(val) => updateField("requestorDate", val)}
                className="flex-1"
              />
            </div>
          </div>

          {/* Right: Department & TL Column */}
          <div className="space-y-2.5">
            <div className="flex items-baseline gap-1.5">
              <span className="font-bold text-[11px] text-[#0f172a] whitespace-nowrap">
                Department / Cost Center:
              </span>
              <input
                type="text"
                value={data.departmentCostCenter ?? data.department}
                onChange={(e) => {
                  updateField("departmentCostCenter", e.target.value);
                  updateField("department", e.target.value);
                }}
                className={`border-b border-[#0f172a] bg-transparent focus:outline-none flex-1 text-xs px-1 ${
                  hasError("department") ? "border-red-500 bg-red-50/50" : ""
                }`}
              />
            </div>

            <div className="flex items-baseline gap-1.5">
              <span className="font-bold text-[11px] text-[#0f172a] whitespace-nowrap">
                TL Signature over Printed Name:
              </span>
              <input
                type="text"
                value={data.tlSignatureName ?? data.approvedByName ?? ""}
                onChange={(e) => {
                  updateField("tlSignatureName", e.target.value);
                  updateField("approvedByName", e.target.value);
                }}
                placeholder="Printed Name"
                className="border-b border-[#0f172a] bg-transparent focus:outline-none flex-1 text-xs px-1"
              />
            </div>

            {/* TL Signature E-Sig Pad / Draw / Upload Preview */}
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-[11px] text-[#0f172a] whitespace-nowrap">
                TL Signature:
              </span>
              <div className="flex-1 flex items-center justify-between border-b border-[#0f172a] pb-0.5 min-h-[32px]">
                {data.tlSignatureDataUrl ? (
                  <div className="flex items-center gap-2">
                    <img
                      src={data.tlSignatureDataUrl}
                      alt="TL Signature"
                      className="h-8 max-w-[150px] object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => setIsTlSignatureModalOpen(true)}
                      className="text-[10px] text-[#003366] underline print:hidden"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsTlSignatureModalOpen(true)}
                    className="text-[11px] text-[#003366] hover:underline flex items-center gap-1 py-1 font-medium print:hidden"
                  >
                    <PenTool size={12} /> Click to Sign / Upload
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-baseline gap-1.5">
              <span className="font-bold text-[11px] text-[#0f172a] whitespace-nowrap">
                Date (MM/DD/YYYY):
              </span>
              <PrimeDatePicker
                value={data.tlSignatureDate ?? ""}
                onChange={(val) => updateField("tlSignatureDate", val)}
                className="flex-1"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 9: TO BE FILLED OUT BY FINANCE / ACCOUNTING ONLY */}
      {/* ========================================================================= */}
      <div className="mb-2">
        <div className="border border-[#334155]">
          <div className="bg-[#e6ecfe] px-2.5 py-1 text-[11px] font-bold text-[#003366] uppercase tracking-wide border-b border-[#334155]">
            TO BE FILLED OUT BY FINANCE / ACCOUNTING ONLY
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 text-xs">
            {/* Top Row: ClickUp Queue Number & Accomplished Checklist */}
            <div className="p-2 border-b sm:border-r border-[#334155] flex flex-col justify-center">
              <div className="flex items-baseline gap-1.5">
                <span className="font-bold text-[11px] text-[#0f172a] whitespace-nowrap">
                  ClickUp Queue Number:
                </span>
                <input
                  type="text"
                  value={data.clickUpQueueNumber ?? (data.taskId ? `#${data.taskId}` : "")}
                  onChange={(e) => updateField("clickUpQueueNumber", e.target.value)}
                  placeholder="Task ID"
                  className="border-b border-[#334155] bg-transparent focus:outline-none flex-1 text-xs px-1 font-medium"
                />
              </div>
            </div>

            <div className="p-2 border-b border-[#334155]">
              <span className="font-bold text-[11px] text-[#0f172a] block mb-1">
                Accomplished RFP Checklist:
              </span>
              <div className="flex items-center gap-6">
                <PrimeCheckbox
                  checked={data.financeAccomplishedChecklist === "yes"}
                  onChange={(c) => updateField("financeAccomplishedChecklist", c ? "yes" : "")}
                  label="Yes"
                />
                <PrimeCheckbox
                  checked={data.financeAccomplishedChecklist === "no"}
                  onChange={(c) => updateField("financeAccomplishedChecklist", c ? "no" : "")}
                  label="No"
                />
              </div>
            </div>

            {/* Row: Received By | Approved Payment Amount */}
            <div className="p-1.5 border-b sm:border-r border-[#334155] flex items-baseline gap-1.5">
              <span className="font-bold text-[11px] text-[#0f172a] whitespace-nowrap">Received By:</span>
              <input
                type="text"
                value={data.financeReceivedBy ?? data.receivedByName ?? ""}
                onChange={(e) => {
                  updateField("financeReceivedBy", e.target.value);
                  updateField("receivedByName", e.target.value);
                }}
                className="border-b border-[#cbd5e1] bg-transparent focus:outline-none flex-1 text-xs px-1"
              />
            </div>
            <div className="p-1.5 border-b border-[#334155] flex items-baseline gap-1.5">
              <span className="font-bold text-[11px] text-[#0f172a] whitespace-nowrap">Approved Payment Amount (Urgent Request):</span>
              <input
                type="text"
                value={data.financeApprovedPaymentAmountUrgent ?? ""}
                onChange={(e) => updateField("financeApprovedPaymentAmountUrgent", e.target.value)}
                className="border-b border-[#cbd5e1] bg-transparent focus:outline-none flex-1 text-xs px-1"
              />
            </div>

            {/* Row: Received Date | Payment Release Date */}
            <div className="p-1.5 border-b sm:border-r border-[#334155] flex items-baseline gap-1.5">
              <span className="font-bold text-[11px] text-[#0f172a] whitespace-nowrap">Received Date:</span>
              <PrimeDatePicker
                value={data.financeReceivedDate ?? ""}
                onChange={(val) => updateField("financeReceivedDate", val)}
                className="flex-1"
              />
            </div>
            <div className="p-1.5 border-b border-[#334155] flex items-baseline gap-1.5">
              <span className="font-bold text-[11px] text-[#0f172a] whitespace-nowrap">Payment Release Date (Urgent Request):</span>
              <PrimeDatePicker
                value={data.financePaymentReleaseDateUrgent ?? ""}
                onChange={(val) => updateField("financePaymentReleaseDateUrgent", val)}
                className="flex-1"
              />
            </div>

            {/* Row: Reviewed By | Validated By */}
            <div className="p-1.5 border-b sm:border-r border-[#334155] flex items-baseline gap-1.5">
              <span className="font-bold text-[11px] text-[#0f172a] whitespace-nowrap">Reviewed By:</span>
              <input
                type="text"
                value={data.financeReviewedBy ?? ""}
                onChange={(e) => updateField("financeReviewedBy", e.target.value)}
                className="border-b border-[#cbd5e1] bg-transparent focus:outline-none flex-1 text-xs px-1"
              />
            </div>
            <div className="p-1.5 border-b border-[#334155] flex items-baseline gap-1.5">
              <span className="font-bold text-[11px] text-[#0f172a] whitespace-nowrap">Validated By:</span>
              <input
                type="text"
                value={data.financeValidatedBy ?? ""}
                onChange={(e) => updateField("financeValidatedBy", e.target.value)}
                className="border-b border-[#cbd5e1] bg-transparent focus:outline-none flex-1 text-xs px-1"
              />
            </div>

            {/* Row: Date Reviewed | Approved By */}
            <div className="p-1.5 border-b sm:border-r border-[#334155] flex items-baseline gap-1.5">
              <span className="font-bold text-[11px] text-[#0f172a] whitespace-nowrap">Date Reviewed:</span>
              <PrimeDatePicker
                value={data.financeDateReviewed ?? ""}
                onChange={(val) => updateField("financeDateReviewed", val)}
                className="flex-1"
              />
            </div>
            <div className="p-1.5 border-b border-[#334155] flex items-baseline gap-1.5">
              <span className="font-bold text-[11px] text-[#0f172a] whitespace-nowrap">Approved By:</span>
              <input
                type="text"
                value={data.financeApprovedBy ?? data.approvedByName ?? ""}
                onChange={(e) => {
                  updateField("financeApprovedBy", e.target.value);
                  updateField("approvedByName", e.target.value);
                }}
                className="border-b border-[#cbd5e1] bg-transparent focus:outline-none flex-1 text-xs px-1"
              />
            </div>

            {/* Row: Remarks | Date (MM/DD/YYYY) */}
            <div className="p-1.5 sm:border-r border-[#334155] flex items-baseline gap-1.5">
              <span className="font-bold text-[11px] text-[#0f172a] whitespace-nowrap">Remarks:</span>
              <input
                type="text"
                value={data.financeRemarks ?? data.requestedByRemarks ?? ""}
                onChange={(e) => {
                  updateField("financeRemarks", e.target.value);
                  updateField("requestedByRemarks", e.target.value);
                }}
                className="border-b border-[#cbd5e1] bg-transparent focus:outline-none flex-1 text-xs px-1"
              />
            </div>
            <div className="p-1.5 flex items-baseline gap-1.5">
              <span className="font-bold text-[11px] text-[#0f172a] whitespace-nowrap">Date (MM/DD/YYYY):</span>
              <PrimeDatePicker
                value={data.financeDate ?? ""}
                onChange={(val) => updateField("financeDate", val)}
                className="flex-1"
              />
            </div>
          </div>
        </div>

        {/* Disclaimer Footer Note */}
        <p className="mt-2 text-[9.5px] italic text-[#475569] leading-tight">
          This form is invalid without complete signatures and supporting documents. Urgent request is subject to Finance evaluation and does not guarantee expedited release.
        </p>
      </div>

      {/* Requestor Signature Modal */}
      <SignatureModal
        isOpen={isSignatureModalOpen}
        onClose={() => setIsSignatureModalOpen(false)}
        onSave={(dataUrl, type) => {
          updateField("signatureDataUrl", dataUrl);
          updateField("signatureType", type);
        }}
        currentSignature={data.signatureDataUrl}
        title="Requestor Electronic Signature"
      />

      {/* Approver / TL Signature Modal */}
      <SignatureModal
        isOpen={isTlSignatureModalOpen}
        onClose={() => setIsTlSignatureModalOpen(false)}
        onSave={(dataUrl) => {
          updateField("tlSignatureDataUrl", dataUrl);
          updateField("approvedBySignature", dataUrl);
        }}
        currentSignature={data.tlSignatureDataUrl}
        title="Approver / Team Leader Electronic Signature"
      />
    </div>
  );
}
