/**
 * Client-side PDF-to-Image converter
 * Converts PDF files into high-resolution, compressed JPEG images using pdfjs-dist
 * and stitches up to 3 pages vertically for unified OCR / Vision AI processing.
 */

export interface PdfConversionProgress {
  currentPage: number;
  totalPages: number;
  status: string;
}

export interface ConvertPdfOptions {
  maxPages?: number;
  maxWidth?: number;
  quality?: number;
  onProgress?: (progress: PdfConversionProgress) => void;
}

/**
 * Converts a PDF File into a stitched JPEG File in the browser.
 */
export async function convertPdfToImage(
  pdfFile: File,
  options: ConvertPdfOptions = {}
): Promise<File> {
  if (typeof window === "undefined") {
    throw new Error("convertPdfToImage can only be executed in a browser environment.");
  }

  const maxPages = options.maxPages ?? 3;
  const maxWidth = options.maxWidth ?? 1600;
  const quality = options.quality ?? 0.85;

  options.onProgress?.({
    currentPage: 0,
    totalPages: 0,
    status: "Loading PDF rendering engine...",
  });

  // Dynamically import pdfjs-dist in the client
  const pdfjs = await import("pdfjs-dist/build/pdf.min.mjs");

  // Configure worker
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  }

  const arrayBuffer = await pdfFile.arrayBuffer();

  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(arrayBuffer),
    useSystemFonts: true,
  });

  const pdfDoc = await loadingTask.promise;
  const totalDocPages = pdfDoc.numPages;
  const pagesToRender = Math.min(totalDocPages, maxPages);

  const renderedCanvases: HTMLCanvasElement[] = [];

  try {
    for (let pageNum = 1; pageNum <= pagesToRender; pageNum++) {
      options.onProgress?.({
        currentPage: pageNum,
        totalPages: pagesToRender,
        status: `Rendering page ${pageNum} of ${pagesToRender}...`,
      });

      const page = await pdfDoc.getPage(pageNum);
      const unscaledViewport = page.getViewport({ scale: 1.0 });

      // Calculate scale to clamp max width to maxWidth while retaining crisp readability
      const targetScale = Math.min(2.0, Math.max(1.2, maxWidth / unscaledViewport.width));
      const viewport = page.getViewport({ scale: targetScale });

      const canvas = document.createElement("canvas");
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);

      const ctx = canvas.getContext("2d", { willReadFrequently: false });
      if (!ctx) {
        throw new Error("Could not acquire 2D canvas context for PDF rendering.");
      }

      // Fill white background before rendering
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const renderContext = {
        canvasContext: ctx,
        viewport,
      };

      await (page.render(renderContext) as any).promise;
      renderedCanvases.push(canvas);
    }

    options.onProgress?.({
      currentPage: pagesToRender,
      totalPages: pagesToRender,
      status: "Consolidating pages into single document...",
    });

    // Create consolidated master canvas
    const masterWidth = Math.max(...renderedCanvases.map((c) => c.width));
    const masterHeight = renderedCanvases.reduce((sum, c) => sum + c.height, 0);

    const masterCanvas = document.createElement("canvas");
    masterCanvas.width = masterWidth;
    masterCanvas.height = masterHeight;

    const masterCtx = masterCanvas.getContext("2d");
    if (!masterCtx) {
      throw new Error("Could not acquire 2D context for composite canvas.");
    }

    // Fill white background
    masterCtx.fillStyle = "#ffffff";
    masterCtx.fillRect(0, 0, masterWidth, masterHeight);

    let currentY = 0;
    for (let i = 0; i < renderedCanvases.length; i++) {
      const c = renderedCanvases[i];
      // Center horizontally if widths slightly vary
      const offsetX = Math.floor((masterWidth - c.width) / 2);
      masterCtx.drawImage(c, offsetX, currentY);

      // Add a subtle separator rule between pages if multi-page
      if (i < renderedCanvases.length - 1) {
        masterCtx.strokeStyle = "#e2e8f0";
        masterCtx.lineWidth = 2;
        masterCtx.beginPath();
        masterCtx.moveTo(0, currentY + c.height);
        masterCtx.lineTo(masterWidth, currentY + c.height);
        masterCtx.stroke();
      }

      currentY += c.height;
    }

    // Convert master canvas to JPEG Blob
    const blob = await new Promise<Blob>((resolve, reject) => {
      masterCanvas.toBlob(
        (b) => {
          if (b) resolve(b);
          else reject(new Error("Failed to export canvas to JPEG image."));
        },
        "image/jpeg",
        quality
      );
    });

    const baseName = pdfFile.name.replace(/\.pdf$/i, "");
    const convertedFile = new File([blob], `${baseName}-converted.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });

    return convertedFile;
  } finally {
    // Cleanup PDF document worker memory
    try {
      await pdfDoc.destroy();
    } catch {
      // Ignore destroy errors
    }
  }
}
