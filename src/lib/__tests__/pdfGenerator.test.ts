import { beforeEach, describe, expect, it, vi } from "vitest";

const { addImage, addPage, output, toJpeg, jsPdf, setFont, setFontSize, setTextColor, text } = vi.hoisted(() => {
  const addImage = vi.fn();
  const addPage = vi.fn();
  const setFont = vi.fn();
  const setFontSize = vi.fn();
  const setTextColor = vi.fn();
  const text = vi.fn();
  const output = vi.fn((kind: string) => kind === "blob" ? new Blob(["pdf"]) : "data:application/pdf;base64,cGRm");
  const toJpeg = vi.fn().mockResolvedValue("data:image/jpeg;base64,aW1hZ2U=");
  const jsPdf = vi.fn(function MockJsPdf(this: Record<string, unknown>) {
    this.internal = { pageSize: { getWidth: () => 210, getHeight: () => 297 } };
    this.addImage = addImage;
    this.addPage = addPage;
    this.output = output;
    this.setFont = setFont;
    this.setFontSize = setFontSize;
    this.setTextColor = setTextColor;
    this.text = text;
  });
  return { addImage, addPage, output, toJpeg, jsPdf, setFont, setFontSize, setTextColor, text };
});

vi.mock("html-to-image", () => ({ toJpeg }));
vi.mock("jspdf", () => ({ default: jsPdf }));

import { generateRfpPdf, generateRfpImageBlob } from "@/lib/pdfGenerator";

describe("generateRfpPdf", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(document, "fonts", { configurable: true, value: { ready: Promise.resolve() } });
    class LoadedImage {
      width = 1000;
      height = 1500;
      onload?: () => void;
      set src(_value: string) { queueMicrotask(() => this.onload?.()); }
    }
    vi.stubGlobal("Image", LoadedImage);
    const sheet = document.createElement("section");
    sheet.id = "rfp-printable-sheet";
    Object.defineProperty(sheet, "scrollWidth", { value: 850 });
    sheet.getBoundingClientRect = () => ({ width: 850, height: 900 } as DOMRect);
    document.body.replaceChildren(sheet);
  });

  it("creates a single-page A4 PDF and scales a slightly tall form to fit", async () => {
    await generateRfpPdf();

    expect(jsPdf).toHaveBeenCalledWith({ orientation: "portrait", unit: "mm", format: "a4" });
    expect(addPage).not.toHaveBeenCalled();
    expect(addImage).toHaveBeenCalledTimes(1);
    const [, , x, y, width, height] = addImage.mock.calls[0];
    expect(x).toBeGreaterThan(0);
    expect(y).toBe(0);
    expect(width).toBeCloseTo(198);
    expect(height).toBeCloseTo(297);
    expect(setFont).toHaveBeenCalledWith("times", "normal");
    expect(text).toHaveBeenCalledWith("Page 1 of 1", expect.any(Number), expect.any(Number), { align: "center" });
  });

  it("excludes screen-only controls from the captured document", async () => {
    await generateRfpPdf();
    const filter = toJpeg.mock.calls[0][1].filter as (node: HTMLElement) => boolean;
    const control = document.createElement("button");
    control.className = "no-print print:hidden";
    expect(filter(control)).toBe(false);
  });

  it("partitions multi-page documents cleanly across pages with repeated headers and page numbers", async () => {
    const sheet = document.getElementById("rfp-printable-sheet")!;

    // Add child sections
    const sec1 = document.createElement("div");
    sec1.className = "rfp-section";

    const sec2 = document.createElement("div");
    sec2.className = "rfp-section";

    sheet.appendChild(sec1);
    sheet.appendChild(sec2);

    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      if (this.id.includes("rfp-printable-sheet")) {
        return { width: 850, height: 1600 } as DOMRect;
      }
      if (this.classList.contains("rfp-section")) {
        return { width: 850, height: 800 } as DOMRect;
      }
      return { width: 850, height: 50 } as DOMRect;
    });

    await generateRfpPdf();

    expect(addPage).toHaveBeenCalledTimes(1);
    expect(addImage).toHaveBeenCalledTimes(2);
    expect(text).toHaveBeenCalledWith("Page 1 of 2", expect.any(Number), expect.any(Number), { align: "center" });
    expect(text).toHaveBeenCalledWith("Page 2 of 2", expect.any(Number), expect.any(Number), { align: "center" });
  });

  it("generates an optimized preview image blob at full 850px width", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      blob: () => Promise.resolve(new Blob(["preview-image"], { type: "image/jpeg" })),
    }) as unknown as typeof fetch;

    const blob = await generateRfpImageBlob("rfp-printable-sheet");
    expect(blob).toBeInstanceOf(Blob);
    expect(toJpeg).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ width: 850, backgroundColor: "#ffffff" })
    );
  });
});
