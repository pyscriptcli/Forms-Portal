import { describe, expect, it } from "vitest";
import { resolveRequestorDocuments } from "../rfpAttachments";

const attachments = [
  { id: "official", name: "RFP-092026-0003_RFP_PAYEE.pdf", url: "https://attachments.clickup.com/official", type: "application/pdf" },
  { id: "preview", name: "RFP-092026-0003_PORTAL_PREVIEW.jpg", url: "https://attachments.clickup.com/preview", type: "image/jpeg" },
  { id: "quote", name: "RFP-092026-0003_REQUESTOR_QUOTATION_01_QUOTE.png", url: "https://attachments.clickup.com/quote", type: "image/png" },
  { id: "invoice", name: "RFP-092026-0003_REQUESTOR_INVOICE_02_INVOICE.docx", url: "https://attachments.clickup.com/invoice", type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
  { id: "finance", name: "RFP-092026-0003_POP_PAYEE_20260930.pdf", url: "https://attachments.clickup.com/finance", type: "application/pdf" },
];

describe("requestor attachment resolution", () => {
  it("uses exact manifest names and returns every requestor document", () => {
    const manifest = [
      { source: "generated" as const, kind: "official_rfp" as const, documentType: "Official RFP", originalName: "form.pdf", storedName: attachments[0].name, mimeType: "application/pdf", sequence: 1 },
      { source: "requestor" as const, kind: "supporting" as const, documentType: "Quotation", originalName: "quote.png", storedName: attachments[2].name, mimeType: "image/png", sequence: 1 },
      { source: "requestor" as const, kind: "supporting" as const, documentType: "Invoice", originalName: "invoice.docx", storedName: attachments[3].name, mimeType: attachments[3].type, sequence: 2 },
    ];
    expect(resolveRequestorDocuments(attachments, manifest).map((item) => item.originalName)).toEqual(["quote.png", "invoice.docx"]);
  });

  it("conservatively excludes generated and finance files for legacy tasks", () => {
    expect(resolveRequestorDocuments(attachments).map((item) => item.id)).toEqual(["quote", "invoice"]);
  });

  it("does not fuzzy-match when an authoritative manifest exists", () => {
    expect(resolveRequestorDocuments(attachments, [])).toEqual([]);
  });
});
