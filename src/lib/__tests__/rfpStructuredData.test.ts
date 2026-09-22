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
      lineItems: [
        { description: "Vinyl board", quantity: 2, unit: "pc", unitPrice: 693.36, amount: 1386.72 },
        { description: "Canvas frame", quantity: 1, unit: "set", unitPrice: 3852, amount: 3852 },
      ],
    });
  });

  it("rejects malformed or unknown structured payloads", () => {
    expect(parseRfpStructuredData("```forms-portal-json\nnot-json\n```" )).toBeNull();
    expect(parseRfpStructuredData("```forms-portal-json\n{\"schema\":\"future\"}\n```" )).toBeNull();
  });
});
