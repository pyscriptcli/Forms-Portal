"use client";

import React from "react";
import Image from "next/image";

type SheetData = Record<string, string | boolean | undefined>;

function Field({ label, name, data, set, className = "" }: { label: string; name: string; data: SheetData; set: (name: string, value: string) => void; className?: string }) {
  return <label className={`block border border-black p-1.5 font-bold ${className}`}>{label}<input aria-label={label} value={String(data[name] || "")} onChange={(e) => set(name, e.target.value)} className="mt-1 block w-full border-b border-black bg-transparent px-0.5 text-[11px] font-normal outline-none" /></label>;
}

function Band({ children, tone = "gray" }: { children: React.ReactNode; tone?: "gray" | "blue" }) {
  return <div className={`border border-black px-2 py-1 text-center text-[13px] font-bold ${tone === "blue" ? "bg-[#dbeaf8]" : "bg-[#d9d9d9]"}`}>{children}</div>;
}

function Toggle({ label, name, data, set }: { label: string; name: string; data: SheetData; set: (name: string, value: boolean) => void }) {
  return <label className="mr-3 inline-flex items-center gap-1 text-[10px]"><input type="checkbox" checked={Boolean(data[name])} onChange={(e) => set(name, e.target.checked)} />{label}</label>;
}

export function PrimeRfbSheet({ data, onChange }: { data: SheetData; onChange: (data: SheetData) => void }) {
  const set = (name: string, value: string | boolean) => onChange({ ...data, [name]: value });
  return <div id="rfp-printable-sheet" className="mx-auto w-full max-w-[794px] min-h-[1123px] bg-white p-7 text-black shadow-md print:p-0 print:shadow-none" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
    <Band>REQUEST FOR BILLING INVOICE (RFB Form) - LEASING SERVICES</Band>
    <div className="border-x border-b border-black text-center text-[11px] font-semibold">Kindly print this in a Letter Size Bond Paper, pens 1<br /><i>Please make sure all details provided are 100% accurate and correct to ensure fast collection of payments</i></div>
    <div className="mt-2 grid grid-cols-2"><Field label="LESSOR's registered name:" name="lessorName" data={data} set={set} /><Field label="Subject Project/Property name:" name="propertyName" data={data} set={set} /><Field label="LESSOR's billing address:" name="billingAddress" data={data} set={set} className="col-span-2" /></div>
    <div className="border border-black p-2 text-[11px] font-bold">LISTING: <Toggle label="OPEN" name="open" data={data} set={set} /><Toggle label="NON-EX" name="nonEx" data={data} set={set} /><Toggle label="NON-EX WITH TARP" name="tarp" data={data} set={set} /><Toggle label="EXCLUSIVE" name="exclusive" data={data} set={set} /><Toggle label="SOLE" name="sole" data={data} set={set} /></div>
    <div className="grid grid-cols-4"><Field label="Lessor's contact person/s for billing purposes" name="contactPerson" data={data} set={set} /><Field label="Position" name="position" data={data} set={set} /><Field label="Contact Number" name="contactNumber" data={data} set={set} /><Field label="Email Address" name="email" data={data} set={set} /></div>
    <div className="grid grid-cols-2"><Field label="LESSEE's registered name:" name="lesseeName" data={data} set={set} /><Field label="PF scheme:" name="pfScheme" data={data} set={set} /><Field label="What document are you requesting for?" name="requestedDocument" data={data} set={set} /><Field label="Lease term or Duration:" name="leaseTerm" data={data} set={set} /></div>
    <Band>COMPUTATION BREAKDOWN OF PROFESSIONAL FEE:</Band>
    <p className="border-x border-b border-black px-3 py-1 text-center text-[10px]">All payments shown below must be <u>exclusive of VAT</u>. Double-check all details before submitting.</p>
    <div className="grid grid-cols-2"><Field label="Gross / Net Leasable Area covered:" name="leaseArea" data={data} set={set} /><Field label="Monthly Basic Rental Rate:" name="monthlyRental" data={data} set={set} /><Field label="Basic Rental Rate per sqm.:" name="basicRate" data={data} set={set} /><Field label="Monthly CUSA fee:" name="cusaFee" data={data} set={set} /><Field label="No. of parking / Rental rate:" name="parking" data={data} set={set} /><Field label="No. of signages / Rental rate:" name="signages" data={data} set={set} /></div>
    <div className="border border-black bg-[#95d247] p-4 text-center text-[17px] font-bold">TOTAL AMOUNT DUE (PROFESSIONAL FEE): <input aria-label="Total amount due" value={String(data.totalAmount || "")} onChange={(e) => set("totalAmount", e.target.value)} className="ml-2 w-36 border-b border-black bg-transparent text-center outline-none" /> Php</div>
    <div className="grid grid-cols-2"><Field label="Date Contract Signed:" name="contractDate" data={data} set={set} /><Field label="Date of Advance Payment:" name="advancePaymentDate" data={data} set={set} /></div>
    <Band>PLEASE REFER TO PAGE 2 FOR CREDIT SHARING FORM FOR THIS ACCOUNT</Band>
    <div className="mt-8 grid grid-cols-3"><Field label="Prepared by:" name="preparedBy" data={data} set={set} /><Field label="Reviewed by: (Team Leader)" name="reviewedBy" data={data} set={set} /><Field label="Date approved" name="dateApproved" data={data} set={set} /></div>
    <p className="mt-2 border border-black p-2 text-center text-[10px] text-red-800">Please submit this to the Accounting Team together with the accomplished Credit Sharing Form, signed Contract of Lease, and other necessary documents.</p>
  </div>;
}

export function PrimeCreditSharingSheet({ data, onChange }: { data: SheetData; onChange: (data: SheetData) => void }) {
  const set = (name: string, value: string | boolean) => onChange({ ...data, [name]: value });
  const rows = Array.from({ length: 8 }, (_, index) => index);
  return <div id="rfp-printable-sheet" className="mx-auto w-full max-w-[794px] min-h-[1123px] bg-white p-7 text-black shadow-md print:p-0 print:shadow-none" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
    <div className="flex items-center gap-4 border-b-2 border-[#dbeaf8] pb-2"><Image src="/prime-blue-logo.png" alt="PRIME Philippines" width={180} height={60} unoptimized className="h-12 w-auto" /><div className="flex-1 bg-[#dbeaf8] py-2 text-center text-[20px] font-bold">PRIME CREDIT SHARING FORM<br /><span className="text-[13px]">PROPERTY INTERACTIVE MARKETING ENTERPRISE REALTY CORPORATION</span></div></div>
    <p className="my-2 text-[11px] italic">Please make sure all details provided are 100% accurate and correct to ensure fast collection of payments.</p>
    <div className="grid grid-cols-2"><Field label="Lessor's Registered Name" name="lessorName" data={data} set={set} /><Field label="Subject Project / Property Name" name="propertyName" data={data} set={set} /><Field label="Lessee's Registered Name" name="lesseeName" data={data} set={set} /><Field label="PF Scheme / PF Amount" name="pfDetails" data={data} set={set} /></div>
    <Band tone="blue">CREDIT SHARING BREAKDOWN</Band><p className="border-x border-b border-black p-2 text-[10px] italic font-semibold">All percentages detailed below will be considered final. If not applicable, kindly write “N/A”.</p>
    <div className="grid grid-cols-2"><Field label="Internal Credit Share %" name="internalShare" data={data} set={set} /><Field label="External Credit Share %" name="externalShare" data={data} set={set} /><Field label="PRIME's Net Commission Receivable" name="netCommission" data={data} set={set} className="col-span-2" /></div>
    <Band tone="blue">CO-BROKER INFORMATION</Band><div className="border-x border-b border-black p-2"><Toggle label="Signed Broker's Client Registration Form" name="brokerRegistration" data={data} set={set} /><Toggle label="Copy of Valid ID with Specimen Signature" name="validId" data={data} set={set} /><Toggle label="Memorandum of Agreement" name="moa" data={data} set={set} /></div>
    <div className="grid grid-cols-2"><Field label="Broker's or Agent's Name" name="brokerName" data={data} set={set} /><Field label="PRC License ID Number" name="prc" data={data} set={set} /><Field label="Agreed Commission Amount" name="commission" data={data} set={set} /><Field label="Contact Number" name="contactNumber" data={data} set={set} /><Field label="Email Address" name="email" data={data} set={set} /><Field label="Remarks" name="remarks" data={data} set={set} /></div>
    <Band tone="blue">CREDIT SHARING WITHIN PRIME PHILIPPINES</Band><p className="border-x border-b border-black p-1 text-[10px] italic">Credit sharing percentages below are based on the Internal Credit Share only.</p>
    <table className="w-full border-collapse text-[10px]"><thead><tr className="bg-[#eeeeee]"><th className="border border-black p-1">Name</th><th className="border border-black p-1">Department</th><th className="border border-black p-1">Credit Share</th><th className="border border-black p-1">Acknowledgement, Signature</th></tr></thead><tbody>{rows.map((row) => <tr key={row}>{["name", "department", "share", "signature"].map((field) => <td key={field} className="border border-black p-0.5"><input aria-label={`Credit ${field} ${row + 1}`} value={String(data[`credit_${field}_${row}`] || "")} onChange={(e) => set(`credit_${field}_${row}`, e.target.value)} className="w-full bg-transparent outline-none" /></td>)}</tr>)}</tbody></table>
    <Band tone="blue">THE FOLLOWING PORTIONS ARE TO BE PROCESSED BY THE ACCOUNTING AND FINANCE TEAM</Band><div className="grid grid-cols-2"><Field label="Received By / Date Received" name="receivedBy" data={data} set={set} /><Field label="Validated By / Date Validated" name="validatedBy" data={data} set={set} /><Field label="Remarks" name="financeRemarks" data={data} set={set} className="col-span-2" /></div>
  </div>;
}
