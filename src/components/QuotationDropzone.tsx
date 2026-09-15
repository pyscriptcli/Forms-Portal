"use client";

import React, { useRef, useState } from "react";
import { Sparkles, UploadCloud, AlertCircle, X } from "lucide-react";
import { RfpFormData } from "@/types/rfp";
import { convertPdfToImage } from "@/lib/pdfToImage";
import { MAX_DIRECT_UPLOAD_FILE_BYTES } from "@/lib/submissionUploads";

interface QuotationDropzoneProps {
  onDataExtracted: (extractedData: Partial<RfpFormData>, file: File) => void;
}

export function QuotationDropzone({ onDataExtracted }: QuotationDropzoneProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanError, setScanError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const processFile = async (file: File) => {
    setIsScanning(true);
    setScanProgress(8);
    setScanError(null);

    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");

    let fileToUpload: File = file;

    try {
      if (file.size > MAX_DIRECT_UPLOAD_FILE_BYTES) {
        throw new Error(`${file.name} exceeds the 4 MB supporting-file upload limit. Choose a smaller quotation to scan and attach.`);
      }
      if (isPdf) {
        try {
          fileToUpload = await convertPdfToImage(file, {
            maxPages: 3,
            maxWidth: 1600,
            quality: 0.85,
            onProgress: (p) => setScanProgress(p.totalPages ? Math.min(55, 10 + Math.round((p.currentPage / p.totalPages) * 45)) : 12),
          });
        } catch (pdfErr: any) {
          console.warn("Client-side PDF conversion error, falling back to direct PDF upload:", pdfErr);
          // Fall back to original PDF if canvas conversion fails
          fileToUpload = file;
        }
      }

      setScanProgress(65);

      const formData = new FormData();
      formData.append("file", fileToUpload);

      const res = await fetch("/api/rfp/extract", {
        method: "POST",
        body: formData,
      });

      const responseText = await res.text();
      let json: any = null;

      try {
        json = JSON.parse(responseText);
      } catch {
        if (res.status === 413 || responseText.includes("Request Entity Too Large")) {
          throw new Error("Quotation file is too large (exceeds server limit). Please upload a smaller or compressed document.");
        }
        throw new Error(
          res.status >= 500
            ? "Extraction server encountered a temporary error. Please try again or fill fields manually."
            : `Server returned unexpected response (${res.status}).`
        );
      }

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to extract quotation data.");
      }

      setScanProgress(100);

      setTimeout(() => {
        // Keep original PDF file as the form's supporting attachment
        onDataExtracted(json.data, file);
        setIsScanning(false);
      }, 400);
    } catch (err: any) {
      console.error("Extraction error:", err);
      setScanError(err.message || "Error scanning quotation document.");
      setIsScanning(false);
      setScanProgress(0);
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  return (
    <div className="w-full mb-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={handleFileDrop}
        className="bg-prime-white border border-prime-rule hover:border-prime-blue transition-all px-4 py-2.5 shadow-none relative flex flex-col sm:flex-row items-center justify-between gap-3"
      >
        {/* Left: AI Badge + Description */}
        <div className="flex items-center gap-3 text-center sm:text-left">
          <div className="w-8 h-8 bg-prime-white border border-prime-rule text-prime-blue flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-prime-blue" />
          </div>
          <div>
            <div className="flex items-center gap-2 justify-center sm:justify-start">
              <span className="font-medium text-xs text-prime-blue uppercase tracking-wide">
                RFP Auto-Fill
              </span>
            </div>
            <p className="text-[11px] text-prime-ink mt-0.5">
              Drop vendor quotation or invoice (PDF, JPG, PNG) to automatically populate line items & payee
            </p>
          </div>
        </div>

        {/* Right: Upload Button */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isScanning}
            className="h-8 px-4 text-xs font-medium text-prime-blue bg-prime-white hover:bg-prime-blue hover:text-prime-white border border-prime-blue flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
          >
            {isScanning ? (
              <ProgressCircle percent={scanProgress} size={20} />
            ) : (
              <>
                <UploadCloud className="w-3.5 h-3.5 text-prime-blue" />
                <span>Upload Quote</span>
              </>
            )}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) processFile(file);
            }}
          />
        </div>
      </div>

      {/* Live Scan Status Banner */}
      {isScanning && (
        <div className="mt-2 p-2 bg-prime-white border border-prime-rule flex items-center justify-center text-xs font-medium text-prime-blue" aria-label={`Scanning quotation ${scanProgress}%`}>
          <ProgressCircle percent={scanProgress} size={42} />
        </div>
      )}

      {/* Error Alert Banner */}
      {scanError && !isScanning && (
        <div className="mt-2 p-2.5 bg-red-50/80 border border-red-200 flex items-center justify-between gap-2 text-xs font-medium text-red-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{scanError}</span>
          </div>
          <button
            type="button"
            onClick={() => setScanError(null)}
            className="text-red-500 hover:text-red-800 p-0.5"
            aria-label="Dismiss error"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

function ProgressCircle({ percent, size }: { percent: number; size: number }) {
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.max(0, Math.min(100, percent)) / 100) * circumference;
  return <span className="relative inline-flex items-center justify-center" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label={`${percent}%`} style={{ width: size, height: size }}>
    <svg viewBox="0 0 40 40" className="absolute inset-0 -rotate-90" aria-hidden="true">
      <circle cx="20" cy="20" r={radius} fill="none" stroke="currentColor" strokeOpacity=".18" strokeWidth="3" />
      <circle cx="20" cy="20" r={radius} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} />
    </svg>
    <span className="relative text-[9px] font-semibold leading-none">{percent}%</span>
  </span>;
}
