import { describe, expect, it } from "vitest";
import { parseRfpStructuredData, serializeRfpStructuredData } from "../rfpStructuredData";

describe("RFP structured data", () => {
  it("round-trips dynamic line items through a versioned ClickUp description block", () => {
    const block = serializeRfpStructuredData([
      { id: "1", description: "Vinyl board", qty: 2, unit: "pc", unitPrice: "693.36", amount: 1386.72 },
      { id: "2", description: "Canvas frame", qty: 1, unit: "set", unitPrice: 3852, amount: 3852 },
    ], 5238.72);

    expect(parseRfpStructuredData(`Human-readable details\n\n${block}`)).toEqual({
      schema: "forms-portal/rfp@1",
      currency: "PHP",
      totalAmount: 5238.72,
      documents: [],
      lineItems: [
        { description: "Vinyl board", quantity: 2, unit: "pc", unitPrice: 693.36, amount: 1386.72 },
        { description: "Canvas frame", quantity: 1, unit: "set", unitPrice: 3852, amount: 3852 },
      ],
    });
  });

  it("round-trips and sanitizes an attachment manifest", () => {
    const documents = [{ source: "requestor", kind: "supporting", documentType: "Supplier quotation", originalName: "quote.png", storedName: "RFP-1_REQUESTOR_QUOTATION_01_QUOTE.png", mimeType: "image/png", sequence: 1 }];
    const parsed = parseRfpStructuredData(serializeRfpStructuredData([], 100, "PHP", documents));
    expect(parsed?.documents).toEqual(documents);
  });

  it("rejects malformed or unknown structured payloads", () => {
    expect(parseRfpStructuredData("```forms-portal-json\nnot-json\n```" )).toBeNull();
    expect(parseRfpStructuredData("```forms-portal-json\n{\"schema\":\"future\"}\n```" )).toBeNull();
  });
});
