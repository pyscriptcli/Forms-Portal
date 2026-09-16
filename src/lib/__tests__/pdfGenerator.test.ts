import { beforeEach, describe, expect, it, vi } from "vitest";

const { addImage, addPage, output, toJpeg, jsPdf } = vi.hoisted(() => {
  const addImage = vi.fn();
  const addPage = vi.fn();
  const output = vi.fn((kind: string) => kind === "blob" ? new Blob(["pdf"]) : "data:application/pdf;base64,cGRm");
  const toJpeg = vi.fn().mockResolvedValue("data:image/jpeg;base64,aW1hZ2U=");
  const jsPdf = vi.fn(function MockJsPdf(this: Record<string, unknown>) {
    this.internal = { pageSize: { getWidth: () => 210, getHeight: () => 297 } };
    this.addImage = addImage;
    this.addPage = addPage;
    this.output = output;
  });
  return { addImage, addPage, output, toJpeg, jsPdf };
});

vi.mock("html-to-image", () => ({ toJpeg }));
vi.mock("jspdf", () => ({ default: jsPdf }));

import { generateRfpPdf } from "@/lib/pdfGenerator";

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
    sheet.getBoundingClientRect = () => ({ width: 850 }) as DOMRect;
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
  });

  it("excludes screen-only controls from the captured document", async () => {
    await generateRfpPdf();
    const filter = toJpeg.mock.calls[0][1].filter as (node: HTMLElement) => boolean;
    const control = document.createElement("button");
    control.className = "no-print print:hidden";
    expect(filter(control)).toBe(false);
  });
});
