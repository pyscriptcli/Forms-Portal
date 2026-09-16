import jsPDF from "jspdf";
import { toJpeg } from "html-to-image";

export interface GeneratedPdfResult {
  blob: Blob;
  dataUrl: string;
}

/**
 * Standard A4 print dimensions at 850px document width.
 * A4 aspect ratio is 297 / 210 = 1.414285.
 * 850 * 1.414285 = ~1202px total page height.
 * Leaving top margin and bottom footer space gives an optimal content budget of ~1120px.
 */
const PRINT_DOC_WIDTH = 850;
const A4_MAX_CONTENT_HEIGHT_PX = 1130;

/**
 * Creates an isolated off-screen sandbox containing a deep clone of the printable element.
 * Synchronizes all live form inputs, textareas, and canvas signatures.
 * Removes scrollbars and screen-only controls so elements render edge-to-edge at exactly 850px width.
 */
export function createPrintSandbox(sourceElement: HTMLElement): {
  sandbox: HTMLElement;
  clone: HTMLElement;
  cleanup: () => void;
} {
  const sandbox = document.createElement("div");
  sandbox.style.cssText = `
    position: fixed;
    left: -9999px;
    top: 0;
    width: ${PRINT_DOC_WIDTH}px;
    min-width: ${PRINT_DOC_WIDTH}px;
    max-width: ${PRINT_DOC_WIDTH}px;
    background: #ffffff;
    z-index: -9999;
    box-sizing: border-box;
    overflow: visible;
    margin: 0;
    padding: 0;
  `;

  const clone = sourceElement.cloneNode(true) as HTMLElement;
  clone.id = "rfp-printable-sheet-clone";
  clone.style.width = `${PRINT_DOC_WIDTH}px`;
  clone.style.minWidth = `${PRINT_DOC_WIDTH}px`;
  clone.style.maxWidth = `${PRINT_DOC_WIDTH}px`;
  clone.style.margin = "0";
  clone.style.boxSizing = "border-box";
  clone.style.border = "none";
  clone.style.boxShadow = "none";

  // Synchronize inputs
  const srcInputs = sourceElement.querySelectorAll<HTMLInputElement>("input");
  const clnInputs = clone.querySelectorAll<HTMLInputElement>("input");
  srcInputs.forEach((srcInput, idx) => {
    const clnInput = clnInputs[idx];
    if (!clnInput) return;
    if (srcInput.type === "checkbox" || srcInput.type === "radio") {
      clnInput.checked = srcInput.checked;
      if (srcInput.checked) {
        clnInput.setAttribute("checked", "checked");
      } else {
        clnInput.removeAttribute("checked");
      }
    } else {
      clnInput.value = srcInput.value;
      clnInput.setAttribute("value", srcInput.value);
    }
  });

  // Synchronize textareas
  const srcTextareas = sourceElement.querySelectorAll<HTMLTextAreaElement>("textarea");
  const clnTextareas = clone.querySelectorAll<HTMLTextAreaElement>("textarea");
  srcTextareas.forEach((srcTa, idx) => {
    const clnTa = clnTextareas[idx];
    if (!clnTa) return;
    clnTa.value = srcTa.value;
    clnTa.textContent = srcTa.value;
    const computedHeight = Math.max(srcTa.scrollHeight, srcTa.clientHeight, 20);
    clnTa.style.height = `${computedHeight}px`;
  });

  // Synchronize signature canvases
  const srcCanvases = sourceElement.querySelectorAll<HTMLCanvasElement>("canvas");
  const clnCanvases = clone.querySelectorAll<HTMLCanvasElement>("canvas");
  srcCanvases.forEach((srcCanvas, idx) => {
    const clnCanvas = clnCanvases[idx];
    if (!clnCanvas) return;
    clnCanvas.width = srcCanvas.width;
    clnCanvas.height = srcCanvas.height;
    const ctx = clnCanvas.getContext("2d");
    if (ctx) {
      try {
        ctx.drawImage(srcCanvas, 0, 0);
      } catch {}
    }
  });

  // Remove screen-only and ignored controls
  const ignoredElements = clone.querySelectorAll<HTMLElement>(
    '.no-print, .print\\:hidden, [data-pdf-ignore="true"], [data-html2canvas-ignore="true"]'
  );
  ignoredElements.forEach((el) => el.remove());

  // Force all overflow scroll containers to visible so no scrollbars are rendered
  const scrollContainers = clone.querySelectorAll<HTMLElement>(
    ".overflow-x-auto, .overflow-y-auto, .overflow-auto, .overflow-scroll"
  );
  scrollContainers.forEach((el) => {
    el.style.overflow = "visible";
    el.style.width = "100%";
    el.style.maxWidth = "none";
  });

  sandbox.appendChild(clone);
  document.body.appendChild(sandbox);

  const cleanup = () => {
    if (sandbox.parentNode) {
      sandbox.parentNode.removeChild(sandbox);
    }
  };

  return { sandbox, clone, cleanup };
}

/**
 * Creates a compact branded header for Page 2+ of multi-page documents.
 */
function createCompactPrintHeader(documentCode: string, isGw: boolean = false): HTMLElement {
  const header = document.createElement("div");
  header.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 2px solid ${isGw ? "#a33f55" : "#003366"};
    font-family: "Times New Roman", Times, Georgia, serif;
    box-sizing: border-box;
    width: 100%;
  `;

  header.innerHTML = `
    <div style="display: flex; align-items: center; gap: 10px;">
      <img src="${isGw ? "/greatwork-logo.png" : "/prime-blue-logo.png"}" alt="Logo" style="height: 28px; width: auto; object-fit: contain;" />
      <div>
        <span style="font-weight: bold; font-size: 13px; color: ${isGw ? "#a33f55" : "#003366"}; text-transform: uppercase; letter-spacing: 0.05em;">REQUEST FOR PAYMENT (RFP)</span>
        <span style="display: block; font-size: 8px; color: #002B49; text-transform: uppercase; font-weight: bold;">${isGw ? "MY GREATWORK SPACES INC." : "PROPERTY INTERACTIVE MARKETING ENTERPRISE REALTY CORP."}</span>
      </div>
    </div>
    <div style="font-size: 11px; font-weight: bold; color: #002B49; font-family: monospace;">
      ${documentCode ? `Doc No: ${documentCode}` : ""}
    </div>
  `;

  return header;
}

/**
 * Partitions the sections of the cloned sheet into clean A4 page elements.
 */
function partitionSectionsIntoPages(
  clone: HTMLElement,
  documentCode: string,
  isGw: boolean
): HTMLElement[] {
  // Collect top-level child sections
  const sections = Array.from(clone.children) as HTMLElement[];
  if (sections.length <= 1) return [clone];

  const pages: HTMLElement[] = [];
  let currentPage = createPageWrapper(isGw);
  let currentHeight = 0;

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const sectionHeight = section.getBoundingClientRect().height || section.offsetHeight || 50;

    // Check if adding this section exceeds page content budget
    if (pages.length === 0 && currentHeight + sectionHeight <= A4_MAX_CONTENT_HEIGHT_PX) {
      currentPage.appendChild(section);
      currentHeight += sectionHeight;
    } else if (pages.length > 0 && currentHeight + sectionHeight <= A4_MAX_CONTENT_HEIGHT_PX) {
      currentPage.appendChild(section);
      currentHeight += sectionHeight;
    } else {
      // If current page already has content, push it and start a new page
      if (currentPage.children.length > 0) {
        pages.push(currentPage);
        currentPage = createPageWrapper(isGw);
        // Add compact header to continuation pages
        const compactHeader = createCompactPrintHeader(documentCode, isGw);
        currentPage.appendChild(compactHeader);
        currentHeight = compactHeader.offsetHeight || 50;
      }

      currentPage.appendChild(section);
      currentHeight += sectionHeight;
    }
  }

  if (currentPage.children.length > 0) {
    pages.push(currentPage);
  }

  return pages.length > 0 ? pages : [clone];
}

function createPageWrapper(isGw: boolean): HTMLElement {
  const page = document.createElement("div");
  page.className = `bg-white text-[#111111] rfp-sheet text-xs select-text ${isGw ? "gw-rfp-sheet" : ""}`;
  page.style.cssText = `
    width: ${PRINT_DOC_WIDTH}px;
    min-width: ${PRINT_DOC_WIDTH}px;
    max-width: ${PRINT_DOC_WIDTH}px;
    background: #ffffff;
    box-sizing: border-box;
    font-family: "Times New Roman", Times, Georgia, serif;
    padding: 24px 28px;
    margin: 0;
    overflow: visible;
  `;
  return page;
}

/**
 * Generates an official high-resolution A4 PDF from the printable RFP DOM element.
 * Captures in an isolated 850px container to eliminate horizontal clipping and scrollbars.
 * Cleanly breaks multi-page forms at section boundaries with repeated compact headers.
 */
export async function generateRfpPdf(
  elementId: string = "rfp-printable-sheet",
  options: { quality?: number; pixelRatio?: number } = {}
): Promise<GeneratedPdfResult> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element with id "${elementId}" not found for PDF generation.`);
  }

  await document.fonts.ready;

  // 1. Create off-screen sandbox at fixed 850px width
  const { sandbox, clone, cleanup } = createPrintSandbox(element);

  try {
    const isGw = clone.classList.contains("gw-rfp-sheet") || element.classList.contains("gw-rfp-sheet");
    const docCodeInput = clone.querySelector<HTMLInputElement>("input[aria-label='RFP number']");
    const documentCode = docCodeInput ? docCodeInput.value : "";

    const totalHeight = clone.getBoundingClientRect().height || clone.offsetHeight;

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    const printFilter = (node: HTMLElement) => {
      if (!node || !node.classList) return true;
      return (
        !node.classList.contains("no-print") &&
        !node.classList.contains("print:hidden") &&
        node.getAttribute?.("data-pdf-ignore") !== "true"
      );
    };

    // Check if the whole document fits on a single A4 page
    if (totalHeight <= A4_MAX_CONTENT_HEIGHT_PX + 40) {
      const imgData = await toJpeg(clone, {
        quality: options.quality ?? 0.88,
        pixelRatio: options.pixelRatio ?? 1.35,
        width: PRINT_DOC_WIDTH,
        backgroundColor: "#ffffff",
        filter: printFilter,
      });

      const img = new Image();
      img.src = imgData;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = (e) => reject(e);
      });

      const scale = Math.min(pdfWidth / img.width, pdfHeight / img.height);
      const renderWidth = img.width * scale;
      const renderHeight = img.height * scale;
      const x = (pdfWidth - renderWidth) / 2;

      pdf.addImage(imgData, "JPEG", x, 0, renderWidth, renderHeight, undefined, "FAST");

      // Add page numbering footer
      if (typeof (pdf as any).setFont === "function") {
        (pdf as any).setFont("times", "normal");
        (pdf as any).setFontSize(9);
        (pdf as any).setTextColor(100, 116, 139);
        (pdf as any).text("Page 1 of 1", pdfWidth / 2, pdfHeight - 6, { align: "center" });
      }
    } else {
      // Multi-page layout: partition sections cleanly across pages
      const pageElements = partitionSectionsIntoPages(clone, documentCode, isGw);
      const totalPages = pageElements.length;

      for (let p = 0; p < totalPages; p++) {
        const pageEl = pageElements[p];
        sandbox.replaceChildren(pageEl);

        const pageImgData = await toJpeg(pageEl, {
          quality: options.quality ?? 0.88,
          pixelRatio: options.pixelRatio ?? 1.35,
          width: PRINT_DOC_WIDTH,
          backgroundColor: "#ffffff",
          filter: printFilter,
        });
        
        const img = new Image();
        img.src = pageImgData;
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = (e) => reject(e);
        });

        if (p > 0) {
          pdf.addPage();
        }

        const scale = Math.min(pdfWidth / img.width, (pdfHeight - 12) / img.height);
        const renderWidth = img.width * scale;
        const renderHeight = img.height * scale;
        const x = (pdfWidth - renderWidth) / 2;

        pdf.addImage(pageImgData, "JPEG", x, 2, renderWidth, renderHeight, undefined, "FAST");

        // Formal Times New Roman footer page numbering
        if (typeof (pdf as any).setFont === "function") {
          (pdf as any).setFont("times", "normal");
          (pdf as any).setFontSize(9);
          (pdf as any).setTextColor(100, 116, 139);
          (pdf as any).text(`Page ${p + 1} of ${totalPages}`, pdfWidth / 2, pdfHeight - 6, { align: "center" });
        }
      }
    }

    const blob = pdf.output("blob");
    const dataUrl = pdf.output("dataurlstring");

    return { blob, dataUrl };
  } finally {
    cleanup();
  }
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
 * Uses 850px sandbox isolation to ensure the preview is full-width with no clipping or scrollbars.
 */
export async function generateRfpImageBlob(elementId: string = "rfp-printable-sheet"): Promise<Blob> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element with id "${elementId}" not found for image generation.`);
  }

  await document.fonts.ready;
  const { clone, cleanup } = createPrintSandbox(element);

  try {
    const dataUrl = await toJpeg(clone, {
      quality: 0.85,
      pixelRatio: 1.2,
      width: PRINT_DOC_WIDTH,
      backgroundColor: "#ffffff",
      filter: (node: HTMLElement) => {
        if (!node || !node.classList) return true;
        return (
          !node.classList.contains("no-print") &&
          !node.classList.contains("print:hidden") &&
          node.getAttribute?.("data-pdf-ignore") !== "true"
        );
      },
    });

    const res = await fetch(dataUrl);
    return await res.blob();
  } finally {
    cleanup();
  }
}
