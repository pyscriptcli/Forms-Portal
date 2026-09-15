import jsPDF from "jspdf";
import { toJpeg, toPng } from "html-to-image";

export interface GeneratedPdfResult {
  blob: Blob;
  dataUrl: string;
}

/**
 * Generates an official high-resolution US Letter PDF from the printable RFP DOM element.
 * Uses html-to-image with optimized JPEG compression to produce a crisp document under 500KB.
 */
export async function generateRfpPdf(elementId: string = "rfp-printable-sheet"): Promise<GeneratedPdfResult> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element with id "${elementId}" not found for PDF generation.`);
  }

  await document.fonts.ready;

  // Capture high-DPI image via browser's native SVG rendering with optimized JPEG compression
  const imgData = await toJpeg(element, {
    quality: 0.92,
    pixelRatio: 1.5,
    backgroundColor: "#ffffff",
    filter: (node) => {
      if (node instanceof HTMLElement) {
        if (
          node.classList.contains("no-print") ||
          node.getAttribute("data-html2canvas-ignore") === "true" ||
          node.getAttribute("data-pdf-ignore") === "true"
        ) {
          return false;
        }
      }
      return true;
    },
  });

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "letter",
  });

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();

  // Scale image to fit page width
  const img = new Image();
  img.src = imgData;
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = (e) => reject(e);
  });

  const imgWidth = pdfWidth;
  const imgHeight = (img.height * pdfWidth) / img.width;

  // Smart single-page fit: if the sheet slightly exceeds 1 page (up to 15%),
  // scale it proportionally to fit 1 crisp page without awkward page breaks.
  if (imgHeight <= pdfHeight * 1.15) {
    const scale = Math.min(1, pdfHeight / imgHeight);
    const renderWidth = imgWidth * scale;
    const renderHeight = imgHeight * scale;
    const xOffset = (pdfWidth - renderWidth) / 2;
    pdf.addImage(imgData, "JPEG", xOffset, 0, renderWidth, renderHeight);
  } else {
    // Multi-page pagination: paginate across sequential pages
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
    heightLeft -= pdfHeight;

    while (heightLeft > 0) {
      position = -(imgHeight - heightLeft);
      pdf.addPage();
      pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;
    }
  }

  const blob = pdf.output("blob");
  const dataUrl = pdf.output("dataurlstring");

  return { blob, dataUrl };
}

/**
 * Triggers a browser download of the generated PDF.
 */
export function downloadPdfBlob(blob: Blob, filename: string = "Request_For_Payment.pdf") {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Generates an optimized preview image Blob of the printable RFP sheet for embedding in ClickUp tasks.
 * Uses JPEG compression (quality: 0.85, ~120KB) to ensure request payloads stay well below server limits.
 */
export async function generateRfpImageBlob(elementId: string = "rfp-printable-sheet"): Promise<Blob> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element with id "${elementId}" not found for image generation.`);
  }

  await document.fonts.ready;
  const dataUrl = await toJpeg(element, {
    quality: 0.85,
    pixelRatio: 1.2,
    backgroundColor: "#ffffff",
    filter: (node) => {
      if (node instanceof HTMLElement) {
        if (
          node.classList.contains("no-print") ||
          node.getAttribute("data-html2canvas-ignore") === "true" ||
          node.getAttribute("data-pdf-ignore") === "true"
        ) {
          return false;
        }
      }
      return true;
    },
  });

  const res = await fetch(dataUrl);
  return await res.blob();
}
