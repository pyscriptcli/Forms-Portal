"use client";

import React, { useRef, useState } from "react";
import { Sparkles, UploadCloud, Loader2 } from "lucide-react";
import { RfpFormData } from "@/types/rfp";

interface QuotationDropzoneProps {
  onDataExtracted: (extractedData: Partial<RfpFormData>, file: File) => void;
}

export function QuotationDropzone({ onDataExtracted }: QuotationDropzoneProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const processFile = async (file: File) => {
    setIsScanning(true);
    setScanStatus("Analyzing quotation document layout (Free Parser & DeepSeek Vision)...");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/rfp/extract", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to extract quotation data.");
      }

      const sourceLabel =
        json.source === "free_parser"
          ? "via Free Local Parser"
          : json.source === "deepseek_vision"
          ? "via DeepSeek Vision"
          : json.source === "gemini_vision"
          ? "via Gemini Vision"
          : "";

      setScanStatus(`Quotation data extracted ${sourceLabel} successfully!`);
      setTimeout(() => {
        onDataExtracted(json.data, file);
        setIsScanning(false);
        setScanStatus(null);
      }, 400);
    } catch (err: any) {
      console.error("Extraction error:", err);
      alert(err.message || "Error scanning quotation document.");
      setIsScanning(false);
      setScanStatus(null);
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
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-prime-blue" />
                <span>Analyzing Quote...</span>
              </>
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
        <div className="mt-2 p-2 bg-prime-white border border-prime-rule flex items-center justify-center gap-2 text-xs font-medium text-prime-blue animate-pulse">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-prime-blue" />
          <span>{scanStatus}</span>
        </div>
      )}
    </div>
  );
}
