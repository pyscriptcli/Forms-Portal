const FORBIDDEN_FILENAME_CHARS = /[\\/:*?"<>|]/g;

export function normalizePayeeToken(value: string): string {
  return value
    .replace(FORBIDDEN_FILENAME_CHARS, " ")
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, character: string) => character.toUpperCase())
    .replace(/[^a-zA-Z0-9]/g, "") || "Payee";
}

export function normalizeEntityCode(value: string): string {
  const code = value.trim().toUpperCase();
  return ["PRIME", "GW", "EDUCO", "PIM"].includes(code) ? code : "PRIME";
}

export function formatRfpReference(month: string, sequence: number): string {
  if (!/^\d{6}$/.test(month)) throw new Error("RFP reference month must use MMYYYY.");
  if (!Number.isInteger(sequence) || sequence < 1 || sequence > 9999) throw new Error("RFP sequence must be between 0001 and 9999.");
  return `RFP-${month}-${String(sequence).padStart(4, "0")}`;
}

export function highestRfpSequence(values: string[]): number {
  return values.reduce((highest, value) => {
    const match = value.match(/RFP-\d{6}-(\d{4})/i);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);
}

export function formatRfpTaskName(reference: string, entity: string, payee: string, purpose: string): string {
  const shortPurpose = purpose.replace(/\s+/g, " ").trim().split(" ").slice(0, 6).join(" ") || "Request for payment";
  return `[${reference}] ${normalizeEntityCode(entity)} – ${payee.trim() || "Payee"} – ${shortPurpose}`;
}

export function formatSubmittedFilename(reference: string, documentType: string, payee: string, revision?: number, counter?: number): string {
  const type = documentType.trim().toUpperCase();
  const countedType = counter && counter > 1 ? `${type}${counter}` : type;
  const suffix = revision && revision > 0 ? `_R${revision}` : "";
  return `${reference}_${countedType}_${normalizePayeeToken(payee)}${suffix}.pdf`;
}

export function formatFinanceOutputFilename(reference: string, documentType: string, payee: string, issuedDate: Date): string {
  const date = `${issuedDate.getFullYear()}${String(issuedDate.getMonth() + 1).padStart(2, "0")}${String(issuedDate.getDate()).padStart(2, "0")}`;
  return `${reference}_${documentType.trim().toUpperCase()}_${normalizePayeeToken(payee)}_${date}.pdf`;
}
