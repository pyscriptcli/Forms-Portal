"use client";

import React, { useState } from "react";
import Image from "next/image";
import { FinanceOnlySection } from "./FinanceOnlySection";
import { SignatureModal } from "./SignatureModal";
import { PrimeDatePicker } from "./PrimeDatePicker";

type SheetData = Record<string, string | boolean | undefined>;
type Setter = (name: string, value: string | boolean) => void;

function Field({ label, name, data, set, className = "" }: { label: string; name: string; data: SheetData; set: Setter; className?: string }) {
  return (
    <label className={`block border border-black p-1.5 font-bold ${className}`}>
      {label}
      <input aria-label={label} value={String(data[name] || "")} onChange={(event) => set(name, event.target.value)} className="mt-1 block w-full border-b border-black bg-transparent px-0.5 text-[11px] font-normal outline-none" />
    </label>
  );
}

function DateField({ label, name, data, set, className = "" }: { label: string; name: string; data: SheetData; set: Setter; className?: string }) {
  return <label className={`block border border-black p-1.5 font-bold ${className}`}>
    {label}
    <PrimeDatePicker ariaLabel={label} value={String(data[name] || "")} onChange={(value) => set(name, value)} className="mt-1 min-w-0" />
  </label>;
}

function SignatureField({ label, name, data, set, className = "" }: { label: string; name: string; data: SheetData; set: Setter; className?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const signature = String(data[name] || "");
  return <div className={`border border-black p-1.5 font-bold ${className}`}>
    <span>{label}</span>
    {signature ? <div className="mt-1 flex items-center gap-2">
      <img src={signature} alt={`${label} signature`} className="h-8 max-w-[140px] object-contain" />
      <button type="button" onClick={() => setIsOpen(true)} className="text-[10px] font-normal text-[#003366] underline no-print">Change</button>
    </div> : <button type="button" onClick={() => setIsOpen(true)} className="mt-1 block text-[10px] font-normal text-[#003366] underline no-print">Click to Sign</button>}
    <SignatureModal isOpen={isOpen} onClose={() => setIsOpen(false)} currentSignature={signature} title={`${label} Signature`} onSave={(dataUrl) => set(name, dataUrl)} />
  </div>;
}

function DepartmentField({ label, name, data, set, departments, className = "" }: { label: string; name: string; data: SheetData; set: Setter; departments: string[]; className?: string }) {
  return <label className={`block border border-black p-1.5 font-bold ${className}`}>
    {label}
    <select aria-label={label} value={String(data[name] || "")} onChange={(event) => set(name, event.target.value)} className="mt-1 block w-full border-b border-black bg-transparent px-0.5 text-[11px] font-normal outline-none">
      <option value="">Select department</option>
      {departments.map((department) => <option key={department} value={department}>{department}</option>)}
    </select>
  </label>;
}

function Band({ children, tone = "gray" }: { children: React.ReactNode; tone?: "gray" | "blue" }) {
  return <div className={`border border-black px-2 py-1 text-center text-[13px] font-bold ${tone === "blue" ? "bg-[#dbeaf8]" : "bg-[#d9d9d9]"}`}>{children}</div>;
}

function Toggle({ label, name, data, set }: { label: string; name: string; data: SheetData; set: Setter }) {
  return <label className="mr-3 inline-flex items-center gap-1 text-[10px]"><input type="checkbox" checked={Boolean(data[name])} onChange={(event) => set(name, event.target.checked)} />{label}</label>;
}

function PrimeHeader({ title }: { title: string }) {
  return <div className="flex items-center gap-4 border-b-2 border-[#dbeaf8] pb-2"><Image src="/prime-blue-logo.png" alt="PRIME Philippines" width={180} height={60} unoptimized className="h-12 w-auto" /><div className="flex-1 bg-[#dbeaf8] py-2 text-center text-[20px] font-bold">{title}<br /><span className="text-[13px]">PROPERTY INTERACTIVE MARKETING ENTERPRISE REALTY CORPORATION</span></div></div>;
}

function GreatWorkHeader({ title }: { title: string }) {
  return <div className="flex items-center gap-4 border-b border-black pb-1"><Image src="/greatwork-logo.png" alt="GreatWork" width={155} height={44} unoptimized className="h-10 w-auto object-contain" /><div className="flex-1 bg-[#faebeb] py-2 text-center leading-tight"><div className="text-[19px] font-bold text-[#ae2731]">{title}</div><div className="text-[12px] font-bold">MY GREATWORK SPACES INC.</div></div></div>;
}

function GreatWorkBand({ children }: { children: React.ReactNode }) {
  return <div className="border border-black bg-[#faebeb] px-2 py-1 text-[13px] font-bold text-[#ae2731]">{children}</div>;
}

export function PrimeRfbSheet({ data, onChange, departments = [] }: { data: SheetData; onChange: (data: SheetData) => void; departments?: string[] }) {
  const set = (name: string, value: string | boolean) => onChange({ ...data, [name]: value });
  return <div id="rfp-printable-sheet" className="form-a4-sheet bg-white p-7 text-black shadow-md print:p-0 print:shadow-none" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
    <Band>REQUEST FOR BILLING INVOICE (RFB FORM) — LEASING SERVICES</Band>
    <div className="border-x border-b border-black text-center text-[11px] font-semibold">Kindly print this in A4 paper.<br /><i>Please make sure all details provided are 100% accurate and correct to ensure fast collection of payments.</i></div>
    <div className="mt-2 grid grid-cols-2"><Field label="LESSOR's registered name:" name="lessorName" data={data} set={set} /><Field label="Subject Project/Property name:" name="propertyName" data={data} set={set} /><Field label="LESSOR's billing address:" name="billingAddress" data={data} set={set} className="col-span-2" /></div>
    <div className="border border-black p-2 text-[11px] font-bold">LISTING: <Toggle label="OPEN" name="open" data={data} set={set} /><Toggle label="NON-EX" name="nonEx" data={data} set={set} /><Toggle label="NON-EX WITH TARP" name="tarp" data={data} set={set} /><Toggle label="EXCLUSIVE" name="exclusive" data={data} set={set} /><Toggle label="SOLE" name="sole" data={data} set={set} /></div>
    <div className="grid grid-cols-4"><Field label="Lessor's contact person/s for billing purposes" name="contactPerson" data={data} set={set} /><Field label="Position" name="position" data={data} set={set} /><Field label="Contact Number" name="contactNumber" data={data} set={set} /><Field label="Email Address" name="email" data={data} set={set} /></div>
    <div className="grid grid-cols-2"><Field label="LESSEE's registered name:" name="lesseeName" data={data} set={set} /><Field label="PF scheme:" name="pfScheme" data={data} set={set} /><Field label="What document are you requesting for?" name="requestedDocument" data={data} set={set} /><Field label="Lease term or Duration:" name="leaseTerm" data={data} set={set} /></div>
    <Band>COMPUTATION BREAKDOWN OF PROFESSIONAL FEE</Band>
    <p className="border-x border-b border-black px-3 py-1 text-center text-[10px]">All payments shown below must be <u>exclusive of VAT</u>. Double-check all details before submitting.</p>
    <div className="grid grid-cols-2"><Field label="Gross / Net Leasable Area covered:" name="leaseArea" data={data} set={set} /><Field label="Monthly Basic Rental Rate:" name="monthlyRental" data={data} set={set} /><Field label="Basic Rental Rate per sqm.:" name="basicRate" data={data} set={set} /><Field label="Monthly CUSA fee:" name="cusaFee" data={data} set={set} /><Field label="No. of parking / Rental rate:" name="parking" data={data} set={set} /><Field label="No. of signages / Rental rate:" name="signages" data={data} set={set} /></div>
    <div className="border border-black bg-[#95d247] p-4 text-center text-[17px] font-bold">TOTAL AMOUNT DUE (PROFESSIONAL FEE): <input aria-label="Total amount due" value={String(data.totalAmount || "")} onChange={(event) => set("totalAmount", event.target.value)} className="ml-2 w-36 border-b border-black bg-transparent text-center outline-none" /> Php</div>
    <div className="grid grid-cols-2"><DateField label="Date Contract Signed:" name="contractDate" data={data} set={set} /><DateField label="Date of Advance Payment:" name="advancePaymentDate" data={data} set={set} /></div>
    <Band>PLEASE REFER TO THE CREDIT SHARING FORM FOR THIS ACCOUNT</Band>
    <div className="mt-8 grid grid-cols-3"><Field label="Prepared by:" name="preparedBy" data={data} set={set} /><Field label="Reviewed by: (Team Leader)" name="reviewedBy" data={data} set={set} /><DateField label="Date approved" name="dateApproved" data={data} set={set} /></div>
    <p className="mt-2 border border-black p-2 text-center text-[10px] text-red-800">Please submit this to the Accounting Team together with the accomplished Credit Sharing Form, signed Contract of Lease, and other necessary documents.</p>
    <FinanceOnlySection className="mt-3"><Band tone="blue">TO BE FILLED OUT BY FINANCE / ACCOUNTING ONLY</Band><div className="grid grid-cols-2"><Field label="Received By:" name="rfb_receivedBy" data={data} set={set} /><Field label="Validated By:" name="rfb_validatedBy" data={data} set={set} /><DateField label="Date Received:" name="rfb_receivedDate" data={data} set={set} /><DateField label="Date Validated:" name="rfb_validatedDate" data={data} set={set} /><Field label="Remarks:" name="rfb_financeRemarks" data={data} set={set} className="col-span-2" /></div></FinanceOnlySection>
  </div>;
}

export function PrimeCreditSharingSheet({ data, onChange, departments = [] }: { data: SheetData; onChange: (data: SheetData) => void; departments?: string[] }) {
  const set = (name: string, value: string | boolean) => onChange({ ...data, [name]: value });
  const rows = Array.from({ length: 8 }, (_, index) => index);
  return <div id="rfp-printable-sheet" className="form-a4-sheet bg-white p-7 text-black shadow-md print:p-0 print:shadow-none" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
    <PrimeHeader title="PRIME CREDIT SHARING FORM" />
    <p className="my-2 text-[11px] italic">Please make sure all details provided are 100% accurate and correct to ensure fast collection of payments.</p>
    <div className="grid grid-cols-2"><Field label="Lessor's Registered Name" name="lessorName" data={data} set={set} /><Field label="Subject Project / Property Name" name="propertyName" data={data} set={set} /><Field label="Lessee's Registered Name" name="lesseeName" data={data} set={set} /><Field label="PF Scheme / PF Amount" name="pfDetails" data={data} set={set} /></div>
    <Band tone="blue">CREDIT SHARING BREAKDOWN</Band><p className="border-x border-b border-black p-2 text-[10px] italic font-semibold">All percentages detailed below will be considered final. If not applicable, kindly write “N/A”.</p>
    <div className="grid grid-cols-2"><Field label="Internal Credit Share %" name="internalShare" data={data} set={set} /><Field label="External Credit Share %" name="externalShare" data={data} set={set} /><Field label="PRIME's Net Commission Receivable" name="netCommission" data={data} set={set} className="col-span-2" /></div>
    <Band tone="blue">CO-BROKER INFORMATION</Band><div className="border-x border-b border-black p-2"><Toggle label="Signed Broker's Client Registration Form" name="brokerRegistration" data={data} set={set} /><Toggle label="Copy of Valid ID with Specimen Signature" name="validId" data={data} set={set} /><Toggle label="Memorandum of Agreement" name="moa" data={data} set={set} /></div>
    <div className="grid grid-cols-2"><Field label="Broker's or Agent's Name" name="brokerName" data={data} set={set} /><Field label="PRC License ID Number" name="prc" data={data} set={set} /><Field label="Agreed Commission Amount" name="commission" data={data} set={set} /><Field label="Contact Number" name="contactNumber" data={data} set={set} /><Field label="Email Address" name="email" data={data} set={set} /><Field label="Remarks" name="remarks" data={data} set={set} /></div>
    <Band tone="blue">CREDIT SHARING WITHIN PRIME PHILIPPINES</Band><p className="border-x border-b border-black p-1 text-[10px] italic">Credit sharing percentages below are based on the Internal Credit Share only.</p>
    <table className="w-full border-collapse text-[10px]"><thead><tr className="bg-[#eeeeee]"><th className="border border-black p-1">Name</th><th className="border border-black p-1">Department</th><th className="border border-black p-1">Credit Share</th><th className="border border-black p-1">Acknowledgement, Signature</th></tr></thead><tbody>{rows.map((row) => <tr key={row}>{["name", "department", "share", "signature"].map((field) => <td key={field} className="border border-black p-0.5">{field === "department" ? <DepartmentField label={`Credit department ${row + 1}`} name={`credit_department_${row}`} data={data} set={set} departments={departments} className="border-0 p-0" /> : field === "signature" ? <SignatureField label={`Credit signature ${row + 1}`} name={`credit_signature_${row}`} data={data} set={set} className="border-0 p-0" /> : <input aria-label={`Credit ${field} ${row + 1}`} value={String(data[`credit_${field}_${row}`] || "")} onChange={(event) => set(`credit_${field}_${row}`, event.target.value)} className="w-full bg-transparent outline-none" />}</td>)}</tr>)}</tbody></table>
    <FinanceOnlySection className="mt-3"><Band tone="blue">TO BE FILLED OUT BY FINANCE / ACCOUNTING ONLY</Band><div className="grid grid-cols-2"><Field label="Received By" name="receivedBy" data={data} set={set} /><DateField label="Date Received" name="receivedDate" data={data} set={set} /><Field label="Validated By" name="validatedBy" data={data} set={set} /><DateField label="Date Validated" name="validatedDate" data={data} set={set} /><Field label="Remarks" name="financeRemarks" data={data} set={set} className="col-span-2" /></div></FinanceOnlySection>
  </div>;
}

export function GreatWorkRfbSheet({ data, onChange, departments = [] }: { data: SheetData; onChange: (data: SheetData) => void; departments?: string[] }) {
  const set = (name: string, value: string | boolean) => onChange({ ...data, [name]: value });
  return <div id="rfp-printable-sheet" className="form-a4-sheet bg-white p-7 text-black shadow-md print:p-0 print:shadow-none" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
    <GreatWorkHeader title="REQUEST FOR BILLING (RFB)" />
    <div className="mt-3"><GreatWorkBand>TIMING OF SUBMISSION</GreatWorkBand><div className="grid grid-cols-2"><DateField label="Date Accomplished (MM/DD/YY):" name="gw_rfb_accomplishedDate" data={data} set={set} /><DateField label="Billing Due Date (MM/DD/YY):" name="gw_rfb_dueDate" data={data} set={set} /></div></div>
    <div className="mt-3"><GreatWorkBand>LESSEE DETAILS</GreatWorkBand><div className="grid grid-cols-2"><Field label="Client's Registered Name:" name="gw_rfb_clientName" data={data} set={set} /><Field label="Lease Term:" name="gw_rfb_leaseTerm" data={data} set={set} /><Field label="Registered Address:" name="gw_rfb_address" data={data} set={set} /><div className="border border-black p-1.5 text-[11px] font-bold">Lease type:<br /><Toggle label="New Client" name="gw_rfb_newClient" data={data} set={set} /><Toggle label="Contract Renewal" name="gw_rfb_renewal" data={data} set={set} /></div></div><Field label="Remarks:" name="gw_rfb_lesseeRemarks" data={data} set={set} /></div>
    <div className="mt-3"><GreatWorkBand>BILLING CONTACT PERSON DETAILS</GreatWorkBand><div className="grid grid-cols-2"><Field label="Name:" name="gw_rfb_contactName" data={data} set={set} /><Field label="Designation:" name="gw_rfb_designation" data={data} set={set} /><Field label="Contact Number:" name="gw_rfb_contactNumber" data={data} set={set} /><Field label="Email Address:" name="gw_rfb_email" data={data} set={set} /></div></div>
    <div className="mt-3"><GreatWorkBand>BILLING BREAKDOWN</GreatWorkBand><p className="border-x border-b border-black p-1 text-[10px] italic">All details provided will be the basis of billing to the client. Amounts must be exclusive of VAT.</p><div className="grid grid-cols-2"><Field label="Monthly Basic Rental Rate:" name="gw_rfb_monthlyRental" data={data} set={set} /><Field label="Monthly Parking Rental:" name="gw_rfb_parkingRental" data={data} set={set} /><Field label="Initial / Advance Fee — Description / No. of Months / Amount:" name="gw_rfb_advanceFee" data={data} set={set} /><Field label="Security Deposit — Description / No. of Months / Amount:" name="gw_rfb_securityDeposit" data={data} set={set} /><Field label="Others — Description / No. of Months / Amount:" name="gw_rfb_others" data={data} set={set} className="col-span-2" /><Field label="Total Contract Value:" name="gw_rfb_contractValue" data={data} set={set} /><Field label="Total Amount Due for Billing:" name="gw_rfb_amountDue" data={data} set={set} /><DateField label="Date Contract Signed (MM/DD/YY):" name="gw_rfb_contractDate" data={data} set={set} className="col-span-2" /></div></div>
    <div className="mt-3"><GreatWorkBand>REQUESTOR DETAILS — NOTE: RFB MUST BE APPROVED BY TL</GreatWorkBand><div className="grid grid-cols-2"><Field label="Requested By:" name="gw_rfb_requestedBy" data={data} set={set} /><Field label="Approved By:" name="gw_rfb_approvedBy" data={data} set={set} /><Field label="Designation:" name="gw_rfb_requestorDesignation" data={data} set={set} /><Field label="Designation:" name="gw_rfb_approverDesignation" data={data} set={set} /><SignatureField label="Signature:" name="gw_rfb_requestorSignature" data={data} set={set} /><SignatureField label="Signature:" name="gw_rfb_approverSignature" data={data} set={set} /><DateField label="Date (DD/MM/YY):" name="gw_rfb_requestDate" data={data} set={set} /><DateField label="Date (DD/MM/YY):" name="gw_rfb_approvalDate" data={data} set={set} /></div></div>
    <FinanceOnlySection className="mt-3"><GreatWorkBand>TO BE FILLED OUT BY FINANCE / ACCOUNTING ONLY</GreatWorkBand><div className="grid grid-cols-2"><Field label="Reviewed By:" name="gw_rfb_reviewedBy" data={data} set={set} /><Field label="Validated By:" name="gw_rfb_validatedBy" data={data} set={set} /><DateField label="Date Reviewed (MM/DD/YY):" name="gw_rfb_reviewDate" data={data} set={set} /><DateField label="Date Validated (MM/DD/YY):" name="gw_rfb_validationDate" data={data} set={set} /><Field label="Remarks:" name="gw_rfb_financeRemarks" data={data} set={set} className="col-span-2" /></div></FinanceOnlySection>
  </div>;
}

export function GreatWorkCreditSharingSheet({ data, onChange, departments = [] }: { data: SheetData; onChange: (data: SheetData) => void; departments?: string[] }) {
  const set = (name: string, value: string | boolean) => onChange({ ...data, [name]: value });
  const rows = Array.from({ length: 8 }, (_, index) => index);
  return <div id="rfp-printable-sheet" className="form-a4-sheet bg-white p-7 text-black shadow-md print:p-0 print:shadow-none" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
    <GreatWorkHeader title="GREATWORK CREDIT SHARING FORM" />
    <p className="my-2 text-[11px] italic">Please make sure all details provided are 100% accurate and correct to ensure fast collection of payments.</p>
    <div className="grid grid-cols-2"><Field label="Client's Registered Name" name="gw_csf_clientName" data={data} set={set} /><Field label="Lease Period" name="gw_csf_leasePeriod" data={data} set={set} /></div>
    <GreatWorkBand>CREDIT SHARING BREAKDOWN</GreatWorkBand><p className="border-x border-b border-black p-1 text-[10px] italic font-semibold">All details below shall be the basis of Finance for commission computations. Make sure to double-check all details.</p><div className="grid grid-cols-2"><Field label="Internal Credit Share %" name="gw_csf_internalShare" data={data} set={set} /><Field label="External Credit Share %" name="gw_csf_externalShare" data={data} set={set} /></div>
    <GreatWorkBand>CO-BROKER INFORMATION / REFERRAL INFORMATION</GreatWorkBand><div className="border-x border-b border-black p-2 text-[10px] italic">Please write “N/A” if there is no Co-broker.<br /><span className="not-italic"><Toggle label="Signed Broker's Client Registration Form" name="gw_csf_registration" data={data} set={set} /><Toggle label="Copy of Valid ID with Specimen Signature" name="gw_csf_validId" data={data} set={set} /><Toggle label="Memorandum of Agreement" name="gw_csf_moa" data={data} set={set} /></span></div><div className="grid grid-cols-2"><Field label="Broker's or Agent's Name" name="gw_csf_brokerName" data={data} set={set} /><Field label="PRC License ID Number" name="gw_csf_prc" data={data} set={set} /><Field label="Agreed Commission Amount for Broker/Agent" name="gw_csf_commission" data={data} set={set} /><Field label="Contact Number" name="gw_csf_contactNumber" data={data} set={set} /><Field label="Email Address" name="gw_csf_email" data={data} set={set} /><Field label="Remarks" name="gw_csf_brokerRemarks" data={data} set={set} /></div>
    <GreatWorkBand>CREDIT SHARING WITHIN GREATWORK</GreatWorkBand><p className="border-x border-b border-black p-1 text-[10px] italic">Credit sharing percentages below are based on the Internal Credit Share only. If a field is not applicable, kindly write “N/A”.</p><table className="w-full border-collapse text-[10px]"><thead><tr className="bg-[#eeeeee]"><th className="border border-black p-1">Name</th><th className="border border-black p-1">Department</th><th className="border border-black p-1">Credit Share</th><th className="border border-black p-1">Acknowledgement, Signature</th></tr></thead><tbody>{rows.map((row) => <tr key={row}>{["name", "department", "share", "signature"].map((field) => <td key={field} className="border border-black p-0.5">{field === "department" ? <DepartmentField label={`GreatWork credit department ${row + 1}`} name={`gw_csf_credit_department_${row}`} data={data} set={set} departments={departments} className="border-0 p-0" /> : field === "signature" ? <SignatureField label={`GreatWork credit signature ${row + 1}`} name={`gw_csf_credit_signature_${row}`} data={data} set={set} className="border-0 p-0" /> : <input aria-label={`GreatWork credit ${field} ${row + 1}`} value={String(data[`gw_csf_credit_${field}_${row}`] || "")} onChange={(event) => set(`gw_csf_credit_${field}_${row}`, event.target.value)} className="w-full bg-transparent outline-none" />}</td>)}</tr>)}</tbody></table>
    <FinanceOnlySection className="mt-3"><GreatWorkBand>TO BE FILLED OUT BY FINANCE / ACCOUNTING ONLY</GreatWorkBand><div className="grid grid-cols-2"><Field label="Received By" name="gw_csf_receivedBy" data={data} set={set} /><Field label="Validated By" name="gw_csf_validatedBy" data={data} set={set} /><DateField label="Date Received (DD/MM/YY)" name="gw_csf_receivedDate" data={data} set={set} /><DateField label="Date Validated (DD/MM/YY)" name="gw_csf_validatedDate" data={data} set={set} /><Field label="Remarks" name="gw_csf_receivedRemarks" data={data} set={set} /><Field label="Validated Remarks" name="gw_csf_validatedRemarks" data={data} set={set} /></div></FinanceOnlySection>
  </div>;
}
