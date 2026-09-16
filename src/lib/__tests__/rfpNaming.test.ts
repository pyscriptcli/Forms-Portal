import { describe, expect, it } from "vitest";
import {
  formatFinanceOutputFilename,
  formatRfpReference,
  formatRfpTaskName,
  formatSubmittedFilename,
  normalizePayeeToken,
} from "@/lib/rfpNaming";

describe("RFP naming conventions", () => {
  it("formats the global month-based reference", () => {
    expect(formatRfpReference("092026", 142)).toBe("RFP-092026-0142");
  });

  it("limits task purpose to six words", () => {
    expect(formatRfpTaskName("RFP-092026-0142", "GW", "Meralco", "August electricity billing for Cebu site utilities")).toBe(
      "[RFP-092026-0142] GW – Meralco – August electricity billing for Cebu site"
    );
  });

  it("creates sanitized submitted and revision filenames", () => {
    expect(normalizePayeeToken("Juan Dela Cruz / Cebu")).toBe("JuanDelaCruzCebu");
    expect(formatSubmittedFilename("RFP-092026-0143", "INV", "Juan Dela Cruz", 1)).toBe(
      "RFP-092026-0143_INV_JuanDelaCruz_R1.pdf"
    );
  });

  it("uses YYYYMMDD for Finance output filenames", () => {
    expect(formatFinanceOutputFilename("RFP-092026-0142", "POP", "Meralco", new Date(2026, 8, 20))).toBe(
      "RFP-092026-0142_POP_Meralco_20260920.pdf"
    );
  });
});
