"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import confetti from "canvas-confetti";
import {
  RfpFormData,
  RfpLineItem,
  SubmissionResponse,
  SupportingFile,
} from "@/types/rfp";
import { RfpSheet } from "@/components/RfpSheet";
import { TravelBudgetSheet } from "@/components/TravelBudgetSheet";
import { PrimeRfbSheet, PrimeCreditSharingSheet } from "@/components/PrimeLeasingForms";
import { PageHeader } from "@/components/PageHeader";
import { FormSelect } from "@/components/FormSelect";
import { Toolbar } from "@/components/Toolbar";
import { QuotationDropzone } from "@/components/QuotationDropzone";
import { ExtractionBanner } from "@/components/ExtractionBanner";
import { SupportingDocuments } from "@/components/SupportingDocuments";
import { SubmissionModal } from "@/components/SubmissionModal";
import { SubmissionLoadingModal, SubmissionStage } from "@/components/SubmissionLoadingModal";
import { ValidationAlertBanner } from "@/components/ValidationAlertBanner";
import { generateRfpPdf, downloadPdfBlob } from "@/lib/pdfGenerator";
import { assertSubmissionPayloadSize, MAX_DIRECT_UPLOAD_FILE_BYTES } from "@/lib/submissionUploads";
import {
  validateRfpForm,
  ValidationResult,
  ValidationErrorItem,
  scrollToFormField,
} from "@/lib/rfpValidation";
import { AlertCircle } from "lucide-react";

const getInitialFormData = (): RfpFormData => {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const yyyy = String(now.getFullYear());
  const today = `${mm}/${dd}/${yyyy}`;
  const currentTime = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  const initialItems: RfpLineItem[] = [
    { id: "row-1", description: "", qty: "", unit: "pcs", unitPrice: "", amount: 0 },
    { id: "row-2", description: "", qty: "", unit: "pcs", unitPrice: "", amount: 0 },
    { id: "row-3", description: "", qty: "", unit: "pcs", unitPrice: "", amount: 0 },
    { id: "row-4", description: "", qty: "", unit: "pcs", unitPrice: "", amount: 0 },
    { id: "row-5", description: "", qty: "", unit: "pcs", unitPrice: "", amount: 0 },
  ];

  return {
    rfpCodeSuffix: "",
    date: today,
    dateAccomplished: today,
    dueDate: "",
    time: currentTime,
    isUrgentPayment: "no",
    budgetStatus: "within_budget",
    requiredPaymentDate: "",
    reasonForUrgency: "",
    impactIfDelayed: "",
    vendor: "",
    payee: "",
    department: "",
    departmentCostCenter: "",
    items: initialItems,
    totalAmount: 0,
    currencyType: "PHP",
    currencyOther: "",
    purpose: "",
    attachedDocs: {
      invoiceBilling: false,
      soa: false,
      signedContract: false,
      poCostEstimate: false,
      liquidationReceipt: false,
      other: false,
      otherSpecify: "",
    },
    paymentMethod: "online",
    paymentMethods: ["online"],
    bank: "",
    accountName: "",
    accountNumber: "",
    swiftCode: "",
    modeBankTransfer: true,
    modeCheck: false,
    modeWireTransfer: false,
    urgency: "not_urgent",
    urgencyOptions: ["not_urgent"],
    dateNeeded: "",
    requestedByName: "",
    requestedByEmail: "",
    requestorDate: today,
    tlSignatureName: "",
    tlSignatureDate: "",
    signatureType: "none",
    signatureDataUrl: "",
    requestedByRemarks: "",
  };
};

const getSelectedDocumentTypes = (data: RfpFormData): string[] => {
  const attached = data.attachedDocs || {};
  return [
    attached.invoiceBilling && "Invoice / Billing Statement",
    attached.signedContract && "Signed Contract / Agreement",
    attached.liquidationReceipt && "Liquidation / Completion Receipt",
    attached.soa && "Statement of Account (SOA)",
    attached.poCostEstimate && "Purchase Order / Cost Estimate",
    attached.other && (attached.otherSpecify?.trim() ? `Other: ${attached.otherSpecify.trim()}` : "Other"),
  ].filter((value): value is string => Boolean(value));
};

import { useAuth } from "@/components/AuthProvider";

function RfpAppContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const taskIdParam = searchParams.get("taskId");
  const prefillParam = searchParams.get("prefill");
  const tourParam = searchParams.get("tour");
  const formParam = searchParams.get("form");

  const [formData, setFormData] = useState<RfpFormData>(getInitialFormData);
  const [rfpNumberStatus, setRfpNumberStatus] = useState<"loading" | "ready" | "unavailable">("loading");
  const [rfpNumberRefreshKey, setRfpNumberRefreshKey] = useState(0);
  const [selectedForm, setSelectedForm] = useState<string>(formParam ?? "rfp");
  const [primeSubformData, setPrimeSubformData] = useState<Record<string, string | boolean | undefined>>({});
  const [departments, setDepartments] = useState<Array<{ department: string; tlName: string; tlEmail: string }>>([]);
  const [tlOptions, setTlOptions] = useState<Array<{ name: string; email: string }>>([]);
  const [previousDraft, setPreviousDraft] = useState<RfpFormData | null>(null);
  const [extractedBanner, setExtractedBanner] = useState<{
    vendorName: string;
    itemsCount: number;
    totalAmount: number;
  } | null>(null);

  useEffect(() => {
    fetch("/api/admin/settings", { cache: "no-store" }).then((r) => r.json()).then((settings) => {
      if (Array.isArray(settings?.departments)) setDepartments(settings.departments);
      if (Array.isArray(settings?.tlOptions)) setTlOptions(settings.tlOptions);
    }).catch(() => undefined);
  }, []);

  // Sync ClickUp user data into forms if empty
  useEffect(() => {
    if (user) {
      const name = user.username || "";
      const email = user.email || "";

      setFormData((prev) => ({
        ...prev,
        requestedByName: prev.requestedByName || name,
        requestedByEmail: prev.requestedByEmail || email,
      }));
    }
  }, [user]);

  // Display only a number derived from the current ClickUp list. The submit
  // endpoint still rechecks the list before task creation to prevent races.
  useEffect(() => {
    if (taskIdParam || (selectedForm !== "rfp" && selectedForm !== "gw-rfp")) return;
    let cancelled = false;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8000);
    setRfpNumberStatus("loading");
    setFormData((previous) => ({ ...previous, rfpCodeSuffix: "" }));
    fetch("/api/rfp/next-reference", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.message || "Could not read the next RFP number from ClickUp.");
        return result;
      })
      .then((result) => {
        if (!cancelled && typeof result.reference === "string") {
          setFormData((previous) => ({ ...previous, rfpCodeSuffix: result.reference }));
          setRfpNumberStatus("ready");
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.warn("Could not load next ClickUp RFP number:", error);
          setRfpNumberStatus("unavailable");
        }
      })
      .finally(() => window.clearTimeout(timeout));
    return () => { cancelled = true; controller.abort(); window.clearTimeout(timeout); };
  }, [selectedForm, taskIdParam, rfpNumberRefreshKey]);

  const [rawSupportingFiles, setRawSupportingFiles] = useState<File[]>([]);
  const [supportingFilesList, setSupportingFilesList] = useState<SupportingFile[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionStage, setSubmissionStage] = useState<SubmissionStage>("rendering_pdf");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form Validation State
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [missingFieldsList, setMissingFieldsList] = useState<ValidationErrorItem[]>([]);

  // Success dialog state
  const [submissionResponse, setSubmissionResponse] = useState<SubmissionResponse | null>(null);
  const [lastGeneratedPdf, setLastGeneratedPdf] = useState<Blob | null>(null);
  const [lastSubmittedPayee, setLastSubmittedPayee] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Feature flag: admin can disable RFP autofill
  const [rfpAutofillEnabled, setRfpAutofillEnabled] = useState(false);
  useEffect(() => {
    fetch("/api/admin/settings", { cache: "no-store" })
      .then((r) => r.json())
      .then((flags) => {
        if (typeof flags.rfpAutofillEnabled === "boolean") {
          setRfpAutofillEnabled(flags.rfpAutofillEnabled);
        }
      })
      .catch(() => {});
  }, []);

  const fetchTaskData = async (id: string) => {
    try {
      const res = await fetch(`/api/rfp/${id}`);
      if (res.ok) {
        const json = await res.json();
        if (json.task) {
          console.log("Loaded existing ClickUp task for revision:", json.task);
          setSelectedForm("rfp");
        }
      }
    } catch (e) {
      console.warn("Could not load task details for revision:", e);
    }
  };

  const handlePreFillDemo = () => {
    setSelectedForm("rfp");
    const today = new Date().toISOString().split("T")[0];

    setFormData({
      rfpCodeSuffix: "",
      date: today,
      dateAccomplished: today,
      dueDate: "2026-03-25",
      time: "2:30 PM",
      isUrgentPayment: "yes",
      budgetStatus: "within_budget",
      requiredPaymentDate: "2026-03-24",
      reasonForUrgency: "Crucial delivery required before incoming software engineering cohort onboarding on March 26, 2026.",
      impactIfDelayed: "New engineering team cannot be onboarded into development environments, directly stalling ISD Q3 roadmap delivery.",
      vendor: "Silicon Valley Computer Group Inc.",
      payee: "Silicon Valley Computer Group Inc.",
      department: "ISD",
      departmentCostCenter: "ISD / 4010",
      items: [
        {
          id: "demo-item-1",
          description: "Dell Latitude 5440 14\" i7 16GB 512GB SSD",
          qty: 3,
          unit: "pcs",
          unitPrice: 48500,
          amount: 145500,
        },
        {
          id: "demo-item-2",
          description: "Dell UltraSharp 27\" QHD IPS Monitors (U2724D)",
          qty: 6,
          unit: "pcs",
          unitPrice: 14200,
          amount: 85200,
        },
        {
          id: "demo-item-3",
          description: "USB-C Dual 4K Universal Docking Stations",
          qty: 3,
          unit: "pcs",
          unitPrice: 6800,
          amount: 20400,
        },
        { id: "demo-item-4", description: "", qty: "", unit: "pcs", unitPrice: "", amount: 0 },
        { id: "demo-item-5", description: "", qty: "", unit: "pcs", unitPrice: "", amount: 0 },
      ],
      totalAmount: 251100,
      currencyType: "PHP",
      currencyOther: "",
      purpose: "Procurement of workstation hardware and dual-monitor setup for incoming ISD software engineers (Q3 Expansion).",
      attachedDocs: {
        invoiceBilling: true,
        soa: false,
        signedContract: true,
        poCostEstimate: true,
        liquidationReceipt: false,
        other: false,
        otherSpecify: "",
      },
      paymentMethod: "check",
      paymentMethods: ["check"],
      bank: "BDO Unibank",
      accountName: "Silicon Valley Computer Group Inc.",
      accountNumber: "0012-3456-7890",
      swiftCode: "BNORPHMM",
      modeBankTransfer: false,
      modeCheck: true,
      modeWireTransfer: false,
      urgency: "urgent",
      urgencyOptions: ["urgent"],
      dateNeeded: today,
      requestedByName: "DAVE POLICARPIO",
      requestedByEmail: "dave.policarpio@primephilippines.com",
      requestorDate: today,
      tlSignatureName: "ENG. ROLANDO CASTILLO",
      tlSignatureDate: today,
      signatureType: "draw",
      signatureDataUrl:
        "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='60'><path d='M20,40 Q50,10 90,35 T170,25' fill='none' stroke='%23003366' stroke-width='2.5'/></svg>",
      requestedByRemarks: "Approved under Q3 ISD Capital Expenditure budget.",
      clickUpQueueNumber: "TASK-89021",
      financeAccomplishedChecklist: "yes",
    });

    const dummyFile = new File(
      ["Sample vendor quotation for procurement request"],
      "Quotation_SVCG_2026_Q3_ISD_Laptops.pdf",
      { type: "application/pdf" }
    );
    setRawSupportingFiles([dummyFile]);
    setSupportingFilesList([
      {
        id: "demo-doc-1",
        name: "Quotation_SVCG_2026_Q3_ISD_Laptops.pdf",
        size: 245800,
        type: "application/pdf",
        dataUrl: "data:application/pdf;base64,JVBERi0xLjQKJcTl8uXrp/Og0MTGCjQgMC...",
      },
    ]);

    setValidationErrors({});
    setMissingFieldsList([]);
    setErrorMessage(null);
  };

  // Load existing task if in revision mode
  useEffect(() => {
    if (taskIdParam) {
      setFormData((prev) => ({ ...prev, taskId: taskIdParam }));
      fetchTaskData(taskIdParam);
    } else {
      // Try restoring local draft if present
      const savedRfp = localStorage.getItem("prime_rfp_draft");
      if (savedRfp) {
        try {
          const parsed = JSON.parse(savedRfp);
          if (parsed && !parsed.taskId) setFormData(parsed);
        } catch (e) {
          console.error("Failed to parse saved RFP draft:", e);
        }
      }
    }
  }, [taskIdParam]);

  // Auto-save draft changes
  useEffect(() => {
    if (!formData.taskId && formData.payee) {
      localStorage.setItem("prime_rfp_draft", JSON.stringify(formData));
    }
  }, [formData]);

  // Handle prefill query parameter (when triggered from other pages)
  useEffect(() => {
    if (rfpAutofillEnabled && prefillParam === "true") {
      handlePreFillDemo();
      window.history.replaceState(null, "", "/form");
    }
  }, [prefillParam, rfpAutofillEnabled]);

  // Listen for prefill-demo event from drawer when already on page
  useEffect(() => {
    const onPrefill = () => {
      if (rfpAutofillEnabled) handlePreFillDemo();
    };
    window.addEventListener("prefill-demo", onPrefill);
    return () => window.removeEventListener("prefill-demo", onPrefill);
  }, [rfpAutofillEnabled]);

  const getValidationResult = () => {
    if (["travel-budget", "rfb", "credit-sharing"].includes(selectedForm)) return { isValid: true, errors: {}, items: [] } as ValidationResult;
    const result: ValidationResult = validateRfpForm(formData);

    // Require attachments across form submission
    const totalAttached = rawSupportingFiles.length + supportingFilesList.length;
    if (totalAttached === 0) {
      const attachError: ValidationErrorItem = {
        id: "supporting-documents-section",
        field: "supportingFiles",
        label: "Supporting Documents",
        message: "At least one vendor quotation, invoice, or receipt attachment is required.",
      };
      return {
        isValid: false,
        errors: { ...result.errors, supportingFiles: attachError.message },
        items: [...result.items, attachError],
      };
    }

    return result;
  };

  // Auto-clear resolved validation errors in real time
  useEffect(() => {
    if (missingFieldsList.length > 0) {
      const res = getValidationResult();
      setValidationErrors(res.errors);
      setMissingFieldsList(res.items);
    }
  }, [formData, rawSupportingFiles, supportingFilesList]);

  const handleReset = () => {
    if (confirm("Are you sure you want to reset this form? All entered data, attachments, signatures, and local draft data will be cleared.")) {
      localStorage.removeItem("prime_rfp_draft");
      window.history.replaceState(null, "", "/form");
      setSelectedForm("rfp");
      setFormData(getInitialFormData());
      setPreviousDraft(null);
      setExtractedBanner(null);
      setRawSupportingFiles([]);
      setSupportingFilesList([]);
      setErrorMessage(null);
      setSubmissionResponse(null);
      setLastGeneratedPdf(null);
      setIsModalOpen(false);
      setValidationErrors({});
      setMissingFieldsList([]);
    }
  };

  const handlePreviewPdf = async () => {
    setErrorMessage(null);

    // Validate form fields before PDF generation (attachments only required for ClickUp submission)
    const validation = ["travel-budget", "rfb", "credit-sharing"].includes(selectedForm) ? ({ isValid: true, errors: {}, items: [] } as ValidationResult) : validateRfpForm(formData);

    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      setMissingFieldsList(validation.items);
      if (validation.items[0]) {
        scrollToFormField(validation.items[0].id);
      }
      return;
    }

    setIsGeneratingPdf(true);
    try {
      const elementId = "rfp-printable-sheet";
      const { blob } = await generateRfpPdf(elementId);

      const entity = formData.payee || "Payee";
      const dateStr = formData.date;
      const sanitizedEntity = entity.replace(/[^a-zA-Z0-9_-]/g, "_");
      downloadPdfBlob(blob, `RFP_${sanitizedEntity}_${dateStr || "document"}.pdf`);
    } catch (err: any) {
      console.error("PDF generation failed:", err);
      setErrorMessage("Failed to generate PDF. Please ensure all fields are properly formatted.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleDataExtracted = (extracted: Partial<RfpFormData>, file: File) => {
    // Save current form data for Undo
    setPreviousDraft({ ...formData });

    // Populate form fields from quotation
    setFormData((prev) => {
      const updatedItems = extracted.items && extracted.items.length > 0 ? extracted.items : prev.items;
      const computedTotal = updatedItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

      return {
        ...prev,
        vendor: extracted.payee || prev.vendor || prev.payee,
        payee: extracted.payee || prev.payee,
        date: extracted.date || prev.date,
        dateAccomplished: extracted.date || prev.dateAccomplished || prev.date,
        department: extracted.department || prev.department,
        departmentCostCenter: extracted.department || prev.departmentCostCenter || prev.department,
        purpose: extracted.purpose || prev.purpose,
        paymentMethod: extracted.paymentMethod || prev.paymentMethod,
        paymentMethods: extracted.paymentMethod ? [extracted.paymentMethod] : prev.paymentMethods,
        modeBankTransfer: extracted.paymentMethod === "online" || Boolean(extracted.bank || extracted.accountNumber),
        modeCheck: extracted.paymentMethod === "check",
        bank: extracted.bank || prev.bank,
        accountName: extracted.accountName || prev.accountName,
        accountNumber: extracted.accountNumber || prev.accountNumber,
        urgency: extracted.urgency || prev.urgency,
        urgencyOptions: extracted.urgency ? [extracted.urgency] : prev.urgencyOptions,
        isUrgentPayment: extracted.urgency === "urgent" ? "yes" : "no",
        items: updatedItems,
        totalAmount: computedTotal,
        attachedDocs: {
          ...prev.attachedDocs,
          invoiceBilling: true,
        },
      };
    });

    // Automatically register quotation as a supporting document
    setRawSupportingFiles((prev) => [...prev, file]);
    const reader = new FileReader();
    reader.onload = (e) => {
      setSupportingFilesList((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).substring(2, 9),
          name: file.name,
          size: file.size,
          type: file.type,
          dataUrl: e.target?.result as string,
        },
      ]);
    };
    reader.readAsDataURL(file);

    // Show extraction review banner
    setExtractedBanner({
      vendorName: extracted.payee || "Vendor",
      itemsCount: extracted.items?.length || 0,
      totalAmount: extracted.totalAmount || 0,
    });
  };

  const handleUndoExtraction = () => {
    if (previousDraft) {
      setFormData(previousDraft);
      setPreviousDraft(null);
      setExtractedBanner(null);
    }
  };

  const handleSubmit = async () => {
    setErrorMessage(null);

    // Field validation for active form
    const validation = getValidationResult();
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      setMissingFieldsList(validation.items);
      if (validation.items[0]) {
        scrollToFormField(validation.items[0].id);
      }
      return;
    }

    setIsSubmitting(true);
    setSubmissionStage("rendering_pdf");

    try {
      const elementId = "rfp-printable-sheet";
      // 1. Generate the official PDF from the exact printable virtual-form DOM.
      // The generator uses a compressed JPEG internally to avoid exceeding the
      // serverless multipart request limit while preserving the form layout.
      let { blob: pdfBlob } = await generateRfpPdf(elementId);
      if (pdfBlob.size > MAX_DIRECT_UPLOAD_FILE_BYTES) {
        ({ blob: pdfBlob } = await generateRfpPdf(elementId, { quality: 0.68, pixelRatio: 1.1 }));
      }
      if (pdfBlob.size > MAX_DIRECT_UPLOAD_FILE_BYTES) {
        throw new Error("The generated RFP PDF exceeds the 4 MB upload limit. Reduce the form content or signature image size.");
      }
      setLastGeneratedPdf(pdfBlob);

      setSubmissionStage("packaging_attachments");

      const sanitizedFormData = {
        ...formData,
        supportingFiles: (formData.supportingFiles || []).map((f) => ({
          id: f.id,
          name: f.name,
          size: f.size,
          type: f.type,
          dataUrl: "", // Avoid duplicating binary file data in JSON
        })),
      };

      const submissionData = new FormData();
      submissionData.append("formType", selectedForm);
      const dataPayload = JSON.stringify(sanitizedFormData);
      submissionData.append("data", dataPayload);
      submissionData.append("pdf", new File([pdfBlob], "form.pdf", { type: "application/pdf" }));
      rawSupportingFiles.forEach((file) => submissionData.append("supportingFiles", file));
      assertSubmissionPayloadSize(dataPayload, [pdfBlob, ...rawSupportingFiles]);

      setSubmissionStage("uploading_clickup");
      const res = await fetch("/api/rfp/submit", {
        method: "POST",
        body: submissionData,
      });

      // Robust response parsing: handles 413, 502, 504, or non-JSON gracefully
      const resText = await res.text();
      let json: SubmissionResponse | null = null;
      try {
        json = JSON.parse(resText);
      } catch {
        if (res.status === 413 || resText.toLowerCase().includes("request entity too large")) {
          throw new Error("The complete submission exceeds the 4 MB limit. Remove attachments or use smaller files.");
        }
        throw new Error(resText || `Submission request failed with server error (${res.status}).`);
      }

      if (!res.ok || !json?.success) {
        throw new Error(json?.message || "Failed to submit Request for Payment to ClickUp");
      }
      setSubmissionStage("finalizing");
      setLastSubmittedPayee(formData.payee);
      setSubmissionResponse(json);
      setIsModalOpen(true);
      localStorage.removeItem("prime_rfp_draft");
      setFormData({
        ...getInitialFormData(),
        requestedByName: user?.username || "",
        requestedByEmail: user?.email || "",
      });
      setRawSupportingFiles([]);
      setSupportingFilesList([]);
      setPreviousDraft(null);
      setExtractedBanner(null);
      setValidationErrors({});
      setMissingFieldsList([]);
      setRfpNumberRefreshKey((key) => key + 1);
      confetti({
        particleCount: 80,
        spread: 70,
        colors: ["#003366", "#C9A84C"],
        origin: { y: 0.6 },
      });
    } catch (err: any) {
      console.error("Submission failed:", err);
      setErrorMessage(err.message || "Failed to complete submission. Nothing was submitted.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeTaskId = formData.taskId;
  const activeTotalAmount = formData.totalAmount;
  const activePayeeName = formData.payee;

  return (
    <div className="prime-page">
      {/* Container */}
      <div className="w-full">
        <PageHeader
          title="Forms"
          description="Complete your form, attach supporting documents, and submit for review."
          actions={
            <FormSelect
              id="active-form-selector"
              value={selectedForm}
              onChange={(newForm) => {
                setSelectedForm(newForm);
                setValidationErrors({});
                setMissingFieldsList([]);
                setErrorMessage(null);
              }}
            />
          }
        />
        {/* Form controls */}
        <Toolbar
          onPreviewPdf={handlePreviewPdf}
          onReset={handleReset}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          isGeneratingPdf={isGeneratingPdf}
          isRevision={Boolean(activeTaskId)}
          taskId={activeTaskId}
          totalAmount={activeTotalAmount}
          selectedForm={selectedForm}
          onSelectForm={(formKey) => {
            setSelectedForm(formKey);
            setValidationErrors({});
            setMissingFieldsList([]);
            setErrorMessage(null);
          }}
        />

        {/* Error banner */}
        {errorMessage && (
          <div className="mb-4 p-4 bg-prime-white border border-prime-rule text-prime-blue text-xs font-medium flex items-center gap-2.5 animate-shake">
            <AlertCircle className="w-4 h-4 text-prime-blue shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* AI Supplier Quotation Scanner (Dedicated for RFP) */}
        {rfpAutofillEnabled && selectedForm === "rfp" && (
          <div id="quotation-dropzone-section">
            <QuotationDropzone onDataExtracted={handleDataExtracted} />
          </div>
        )}

        {/* Extraction Review & Undo Banner */}
        {rfpAutofillEnabled && selectedForm === "rfp" && extractedBanner && (
          <ExtractionBanner
            vendorName={extractedBanner.vendorName}
            itemsCount={extractedBanner.itemsCount}
            totalAmount={extractedBanner.totalAmount}
            onUndo={handleUndoExtraction}
            onDismiss={() => setExtractedBanner(null)}
          />
        )}

        {/* Interactive Validation Warning Banner */}
        <ValidationAlertBanner
          items={missingFieldsList}
          onDismiss={() => setMissingFieldsList([])}
        />

        {/* Document First Paper Sheet */}
        <section id="rfp-sheet-container" className="prime-form-scroll mb-8" aria-label="Form document">
          {selectedForm === "travel-budget" ? <TravelBudgetSheet data={formData as any} onChange={setFormData as any} /> : selectedForm === "rfb" ? <PrimeRfbSheet data={primeSubformData} onChange={setPrimeSubformData} /> : selectedForm === "credit-sharing" ? <PrimeCreditSharingSheet data={primeSubformData} onChange={setPrimeSubformData} /> : <RfpSheet data={formData} onChange={setFormData} validationErrors={validationErrors} variant={selectedForm === "gw-rfp" ? "gw" : "prime"} rfpNumberStatus={rfpNumberStatus} canEditTlApproval={user?.role === "approver" || user?.role === "admin"} departments={departments.map((item) => item.department)} departmentAssignments={departments} tlOptions={departments.map((item) => ({ name: item.tlName, email: item.tlEmail }))} />}
        </section>

        {/* Supporting Documents Section */}
        {!["rfb", "credit-sharing"].includes(selectedForm) && <section className="mb-12">
          <SupportingDocuments
            files={supportingFilesList}
            onFilesChange={setSupportingFilesList}
            rawFiles={rawSupportingFiles}
            onRawFilesChange={setRawSupportingFiles}
            hasError={Boolean(validationErrors["supportingFiles"])}
            selectedDocumentTypes={getSelectedDocumentTypes(formData)}
          />
        </section>}
      </div>

      {/* Submission Loading Animation Overlay */}
      <SubmissionLoadingModal
        isOpen={isSubmitting}
        stage={submissionStage}
        entityName={activePayeeName}
        totalAmount={activeTotalAmount}
        attachmentsCount={rawSupportingFiles.length || supportingFilesList.length}
        isRevision={Boolean(activeTaskId)}
      />

      {/* Submission Success / Confirmation Modal */}
      <SubmissionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        response={submissionResponse}
        pdfBlob={lastGeneratedPdf}
        payeeName={lastSubmittedPayee || activePayeeName}
      />
    </div>
  );
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-prime-white text-prime-ink text-sm">
          Loading Forms Portal...
        </div>
      }
    >
      <RfpAppContent />
    </Suspense>
  );
}
