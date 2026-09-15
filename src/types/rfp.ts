export interface RfpLineItem {
  id: string;
  description: string;
  qty: number | "";
  unit: string;
  unitPrice: number | "";
  amount: number;
}

export type PaymentMethod = "cash" | "check" | "online" | "";
export type UrgencyLevel = "urgent" | "not_urgent" | "";

export interface DepartmentPreset {
  code: string;
  name: string;
  badgeBg: string;
  badgeText: string;
}

export const DEPARTMENT_PRESETS: DepartmentPreset[] = [
  { code: "COD", name: "COD", badgeBg: "#FF2D78", badgeText: "#FFFFFF" },
  { code: "MARKETING", name: "MARKETING", badgeBg: "#5E3BEE", badgeText: "#FFFFFF" },
  { code: "CRD", name: "CRD", badgeBg: "#9D4EDD", badgeText: "#FFFFFF" },
  { code: "LR", name: "LR", badgeBg: "#E65100", badgeText: "#FFFFFF" },
  { code: "ISD", name: "ISD", badgeBg: "#4A5568", badgeText: "#FFFFFF" }, // Replaced TR with ISD per user request
  { code: "VisMin", name: "VisMin", badgeBg: "#E000B0", badgeText: "#FFFFFF" },
  { code: "CPI", name: "CPI", badgeBg: "#E6ECFE", badgeText: "#3D52A0" },
  { code: "BD", name: "BD", badgeBg: "#E3EEFD", badgeText: "#1E65D6" },
  { code: "HR", name: "HR", badgeBg: "#EAF2FD", badgeText: "#0277BD" },
  { code: "R&A", name: "R&A", badgeBg: "#76B8A3", badgeText: "#134438" },
];

export const DEPARTMENT_NAMES = DEPARTMENT_PRESETS.map((d) => d.name);

export interface SupportingFile {
  id: string;
  name: string;
  size: number;
  type: string;
  dataUrl: string; // base64 for preview / client upload
}

export interface AttachedDocsChecklist {
  invoiceBilling?: boolean;
  soa?: boolean;
  signedContract?: boolean;
  poCostEstimate?: boolean;
  liquidationReceipt?: boolean;
  other?: boolean;
  otherSpecify?: string;
}

export interface RfpFormData {
  // Document Reference / Revision
  taskId?: string; // If editing an existing ClickUp task
  rfpCodeSuffix?: string; // e.g. COD-2026-001 or editable suffix
  
  // Section 1: Timing of Submission
  date: string; // Synced with dateAccomplished
  dateAccomplished?: string;
  dueDate?: string;
  time?: string;
  isUrgentPayment?: "yes" | "no" | "";
  budgetStatus?: "within_budget" | "exceeds_budget" | "";
  
  // Section 2: Urgent Request Details
  requiredPaymentDate?: string;
  reasonForUrgency?: string;
  impactIfDelayed?: string;

  // Section 3: Vendor
  vendor?: string;
  payee: string; // Kept synced with vendor
  department: string;
  
  // Section 4: Items Table & Currency
  items: RfpLineItem[];
  totalAmount: number;
  currencyType?: "PHP" | "other";
  currencyOther?: string;
  
  // Section 5: Purpose / Business Justification
  purpose: string;
  
  // Section 6: Supporting Documents Attached
  attachedDocs?: AttachedDocsChecklist;

  // Section 7: Payee Details & Mode of Payment
  bank: string;
  accountName: string;
  accountNumber: string;
  swiftCode?: string;
  paymentMethod: PaymentMethod;
  paymentMethods?: string[]; // Multi-select
  modeBankTransfer?: boolean;
  modeCheck?: boolean;
  modeWireTransfer?: boolean;
  
  // Section 8: Requestor & Authorized Signatories
  departmentCostCenter?: string;
  requestedByName: string;
  requestedByEmail: string;
  signatureType: "draw" | "upload" | "none";
  signatureDataUrl?: string;
  requestorDate?: string;
  tlSignatureName?: string;
  tlSignatureDate?: string;
  tlSignatureDataUrl?: string;
  requestedByRemarks: string;
  
  // Section 9: Finance / Accounting Only
  clickUpQueueNumber?: string;
  financeAccomplishedChecklist?: "yes" | "no" | "";
  financeReceivedBy?: string;
  financeApprovedPaymentAmountUrgent?: string;
  financeReceivedDate?: string;
  financePaymentReleaseDateUrgent?: string;
  financeReviewedBy?: string;
  financeValidatedBy?: string;
  financeDateReviewed?: string;
  financeApprovedBy?: string;
  financeRemarks?: string;
  financeDate?: string;

  // Approver / Finance Placeholders
  approvedByName?: string;
  approvedBySignature?: string;
  approverName?: string;
  approverEmail?: string;
  receivedByName?: string;
  receivedBySignature?: string;

  // Supporting files
  supportingFiles?: SupportingFile[];
  urgency: UrgencyLevel;
  urgencyOptions?: string[];
  dateNeeded: string;
}

export type FormType = "rfp" | "po" | "pcv";

export interface PoLineItem {
  id: string;
  itemNo: number;
  details: string;
  unit: string;
  quantity: number | "";
  unitPrice: number | "";
  total: number;
}

export interface PoFormData {
  taskId?: string;
  formType?: "po";
  date: string;
  poNumber: string;
  
  // Vendor Information
  vendorName: string;
  address: string;
  tin: string;
  contactNo: string;
  emailAddress: string;
  accountManager: string;
  
  // Items & Financials
  items: PoLineItem[];
  subtotal: number;
  vatRate: number; // e.g. 12
  vatAmount: number;
  netOfVat: number;
  withholdingTaxRate: number; // e.g. 2
  withholdingTaxAmount: number;
  totalAmountDue: number;
  additionalNotes: string;

  // Department & Timeline
  department: string;
  dateNeeded: string;
  urgency: UrgencyLevel;
  
  // Signatures
  preparedByName: string;
  preparedByDate: string;
  notedByName: string;
  notedByDate: string;
  approvedByName: string;
  approvedByDate: string;
  conformeName: string;
  conformeDate: string;

  supportingFiles?: SupportingFile[];
}

export interface PcvParticularItem {
  id: string;
  description: string;
  amount: number | "";
}

export interface PcvFormData {
  taskId?: string;
  formType?: "pcv";
  voucherNo: string;
  date: string;
  payee: string; // Employee
  department: string;
  amount: number; // Auto-sum of particulars
  dateNeeded: string;
  urgency: UrgencyLevel;

  particulars: PcvParticularItem[];
  particularsNotes?: string;

  // Signatures
  requestedByName: string;
  notedByName: string;
  approvedByName: string;
  receivedByName: string;

  supportingFiles?: SupportingFile[];
}

export interface ClickUpTaskResponse {
  id: string;
  name: string;
  url: string;
  custom_id?: string;
  status?: { status: string; color: string };
  isMock?: boolean;
}

export interface SubmissionResponse {
  success: boolean;
  taskId: string;
  taskUrl: string;
  message: string;
  isMock: boolean;
  taskData?: any;
}

