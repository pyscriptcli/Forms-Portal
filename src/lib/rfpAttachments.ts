import type { RfpAttachmentManifestEntry } from "@/types/rfp";

export interface ClickUpAttachmentSummary {
  id: string;
  name: string;
  url: string;
  type?: string;
}

export interface RequestorDocument extends ClickUpAttachmentSummary {
  documentType: string;
  originalName: string;
  source: "requestor";
}

const GENERATED_OR_FINANCE_PATTERN = /(?:_RFP_|_PORTAL_PREVIEW|\bPREVIEW\b|_(?:POP|DV|DISBURSEMENT|PAYMENT_RELEASE|FINANCE_OUTPUT)_)/i;

export function resolveRequestorDocuments(attachments: ClickUpAttachmentSummary[], manifest?: RfpAttachmentManifestEntry[]): RequestorDocument[] {
  if (manifest) {
    const requestorEntries = manifest.filter((entry) => entry.source === "requestor" && entry.kind === "supporting");
    const byStoredName = new Map(requestorEntries.map((entry) => [entry.storedName.toLowerCase(), entry]));
    return attachments.flatMap((attachment) => {
      const entry = byStoredName.get(attachment.name.toLowerCase());
      return entry ? [{ ...attachment, type: entry.mimeType || attachment.type, documentType: entry.documentType, originalName: entry.originalName, source: "requestor" as const }] : [];
    });
  }

  return attachments.flatMap((attachment) => {
    if (GENERATED_OR_FINANCE_PATTERN.test(attachment.name)) return [];
    return [{ ...attachment, documentType: "Supporting document", originalName: attachment.name, source: "requestor" as const }];
  });
}
