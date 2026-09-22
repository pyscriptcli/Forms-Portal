import type { RfpAttachmentManifestEntry, RfpLineItem } from "@/types/rfp";

export interface StoredRfpLineItem {
  description: string;
  unitPrice: number;
  quantity: number;
  amount: number;
  unit?: string;
}

export interface StoredRfpPayloadV1 {
  schema: "forms-portal/rfp@1";
  currency: string;
  totalAmount: number;
  lineItems: StoredRfpLineItem[];
  documents: RfpAttachmentManifestEntry[];
}

const BLOCK_PATTERN = /```forms-portal-json\s*([\s\S]*?)```/i;

function finiteNumber(value: unknown): number {
  const parsed = Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function normalizeRfpLineItems(items: unknown): StoredRfpLineItem[] {
  if (!Array.isArray(items)) return [];
  return items.flatMap((raw) => {
    if (!raw || typeof raw !== "object") return [];
    const item = raw as Partial<RfpLineItem> & { quantity?: unknown };
    const description = String(item.description || "").trim();
    const quantity = finiteNumber(item.qty ?? item.quantity) || 1;
    const unitPrice = finiteNumber(item.unitPrice);
    const amount = finiteNumber(item.amount) || quantity * unitPrice;
    if (!description && amount <= 0) return [];
    return [{ description: description || "Item", unitPrice, quantity, amount, ...(item.unit ? { unit: String(item.unit) } : {}) }];
  });
}

export function normalizeRfpDocuments(documents: unknown): RfpAttachmentManifestEntry[] {
  if (!Array.isArray(documents)) return [];
  return documents.flatMap((raw) => {
    if (!raw || typeof raw !== "object") return [];
    const document = raw as Partial<RfpAttachmentManifestEntry>;
    const source = ["generated", "requestor", "finance"].includes(String(document.source)) ? document.source as RfpAttachmentManifestEntry["source"] : null;
    const kind = ["official_rfp", "preview", "supporting", "finance_output"].includes(String(document.kind)) ? document.kind as RfpAttachmentManifestEntry["kind"] : null;
    const storedName = String(document.storedName || "").trim();
    if (!source || !kind || !storedName) return [];
    return [{
      source,
      kind,
      documentType: String(document.documentType || "Supporting document").trim().slice(0, 120),
      originalName: String(document.originalName || storedName).trim().slice(0, 255),
      storedName: storedName.slice(0, 255),
      mimeType: String(document.mimeType || "application/octet-stream").trim().slice(0, 120),
      sequence: Math.max(1, Math.trunc(finiteNumber(document.sequence) || 1)),
    }];
  });
}

export function serializeRfpStructuredData(items: unknown, totalAmount: unknown, currency = "PHP", documents: unknown = []): string {
  const payload: StoredRfpPayloadV1 = {
    schema: "forms-portal/rfp@1",
    currency: String(currency || "PHP"),
    totalAmount: finiteNumber(totalAmount),
    lineItems: normalizeRfpLineItems(items),
    documents: normalizeRfpDocuments(documents),
  };
  return `\`\`\`forms-portal-json\n${JSON.stringify(payload)}\n\`\`\``;
}

export function parseRfpStructuredData(description: string): StoredRfpPayloadV1 | null {
  const encoded = String(description || "").match(BLOCK_PATTERN)?.[1]?.trim();
  if (!encoded) return null;
  try {
    const parsed = JSON.parse(encoded) as Partial<StoredRfpPayloadV1>;
    if (parsed.schema !== "forms-portal/rfp@1") return null;
    return {
      schema: parsed.schema,
      currency: String(parsed.currency || "PHP"),
      totalAmount: finiteNumber(parsed.totalAmount),
      lineItems: normalizeRfpLineItems(parsed.lineItems),
      documents: normalizeRfpDocuments(parsed.documents),
    };
  } catch {
    return null;
  }
}
