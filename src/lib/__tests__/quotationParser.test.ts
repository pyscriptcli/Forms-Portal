import { describe, it, expect } from "vitest";
import { parseQuotationTextHeuristic } from "@/lib/quotationParser";

describe("quotationParser heuristics", () => {
  it("extracts supplier, line items, bank details and total amount from structured quotation text", () => {
    const quotationText = `
      ACME OFFICE SUPPLIES INC.
      Quotation #: Q-2026-891
      Date: 2026-03-12
      Billed to: PRIME Philippines Realty Corp.

      Items / Description                     Qty   Unit   Unit Price   Total
      1. Ergonomic Mesh Desk Chairs            5     pcs    ₱4,500.00    ₱22,500.00
      2. Wireless Keyboard and Mouse Combo     10    sets   ₱1,200.00    ₱12,000.00

      Subtotal: ₱34,500.00
      VAT (12%): ₱4,140.00
      Grand Total: ₱38,640.00

      Payment Details:
      Bank: BDO Unibank
      Account Name: ACME Office Supplies Inc.
      Account Number: 0012-3456-7890
    `;

    const result = parseQuotationTextHeuristic(quotationText);
    expect(result.success).toBe(true);
    expect(result.data.payee).toContain("ACME OFFICE SUPPLIES INC");
    expect(result.data.date).toBe("2026-03-12");
    expect(result.data.bank).toBe("BDO");
    expect(result.data.accountNumber).toBe("0012-3456-7890");
    expect(result.data.accountName).toContain("ACME Office Supplies Inc");
    expect(result.data.items.length).toBe(2);
    expect(result.data.items[0].description).toBe("Ergonomic Mesh Desk Chairs");
    expect(result.data.items[0].qty).toBe(5);
    expect(result.data.items[0].unitPrice).toBe(4500);
    expect(result.data.items[0].amount).toBe(22500);
    expect(result.data.totalAmount).toBe(38640);
  });

  it("handles alternative vendor prefixes like 'Supplier: ' and 'Vendor: '", () => {
    const text = `
      QUOTATION
      Supplier: TechLink Solutions Corp.
      Date: April 15, 2026
      
      Cloud Hosting Annual Subscription 1 lot ₱60,000.00 ₱60,000.00
      Total: ₱60,000.00
      
      Bank: Metrobank
      Acct No: 1234567890123
    `;

    const result = parseQuotationTextHeuristic(text);
    expect(result.success).toBe(true);
    expect(result.data.payee).toBe("TechLink Solutions Corp.");
    expect(result.data.bank).toBe("METROBANK");
    expect(result.data.accountNumber).toBe("1234567890123");
    expect(result.data.items.length).toBe(1);
    expect(result.data.totalAmount).toBe(60000);
  });

  it("returns success: false when text is blank or non-quotation content", () => {
    const emptyResult = parseQuotationTextHeuristic("");
    expect(emptyResult.success).toBe(false);
    expect(emptyResult.confidence).toBe(0);

    const randomText = "Lorem ipsum dolor sit amet, consectetur adipiscing elit.";
    const randomResult = parseQuotationTextHeuristic(randomText);
    expect(randomResult.success).toBe(false);
  });
});