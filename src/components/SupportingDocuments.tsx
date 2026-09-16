"use client";

import React, { useRef, useState } from "react";
import { Paperclip, UploadCloud, Trash2, FileText, Image as ImageIcon, Eye } from "lucide-react";
import { SupportingFile } from "@/types/rfp";
import { MAX_UPLOAD_FILE_BYTES } from "@/lib/submissionUploads";

interface SupportingDocumentsProps {
  files: SupportingFile[];
  onFilesChange: (files: SupportingFile[]) => void;
  rawFiles: File[];
  onRawFilesChange: (rawFiles: File[]) => void;
  hasError?: boolean;
}

export function SupportingDocuments({
  files,
  onFilesChange,
  rawFiles,
  onRawFilesChange,
  hasError = false,
}: SupportingDocumentsProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectionError, setSelectionError] = useState<string | null>(null);

  const handleFileSelection = (selectedFiles: FileList | null) => {
    if (!selectedFiles || selectedFiles.length === 0) return;

    const selected = Array.from(selectedFiles);
    const oversized = selected.find((file) => file.size > MAX_UPLOAD_FILE_BYTES);
    if (oversized) {
      setSelectionError(`${oversized.name} exceeds the 4 MB submission limit and cannot be attached.`);
      return;
    }
    const newFilesList = selected;
    const updatedRaw = [...rawFiles, ...newFilesList];
    if (updatedRaw.reduce((total, file) => total + file.size, 0) > MAX_UPLOAD_FILE_BYTES) {
      setSelectionError("The combined supporting files exceed the 4 MB submission limit.");
      return;
    }
    setSelectionError(null);
    onRawFilesChange(updatedRaw);

    // Convert to previewable SupportingFile list
    const filePromises = newFilesList.map((file) => {
      return new Promise<SupportingFile>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          resolve({
            id: Math.random().toString(36).substring(2, 9),
            name: file.name,
            size: file.size,
            type: file.type,
            dataUrl: e.target?.result as string,
          });
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(filePromises).then((newItems) => {
      onFilesChange([...files, ...newItems]);
    });
  };

  const removeFile = (index: number) => {
    const updatedFiles = files.filter((_, i) => i !== index);
    const updatedRaw = rawFiles.filter((_, i) => i !== index);
    onFilesChange(updatedFiles);
    onRawFilesChange(updatedRaw);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  return (
    <div
      id="supporting-documents-section"
      className={`bg-prime-white rounded-none border ${
        hasError
          ? "border-2 border-red-600 ring-2 ring-red-200 bg-red-50/10"
          : "border-prime-rule"
      } shadow-none p-6 relative overflow-hidden transition-all`}
    >
      {/* Gold or Red top accent */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${hasError ? "bg-red-600" : "bg-prime-gold"}`} />

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className={`p-2 ${hasError ? "bg-red-600" : "bg-prime-blue"} text-prime-white rounded-none`}>
            <Paperclip className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-serif text-4xl text-prime-blue">
                Supporting Documents
              </h3>
              <span className={`text-[11px] uppercase font-bold tracking-wider px-2 py-0.5 ${
                hasError ? "bg-red-100 text-red-800 border border-red-300" : "bg-prime-white text-prime-blue border border-prime-rule"
              }`}>
                Required
              </span>
            </div>
            <p className="text-xs text-prime-ink mt-0.5">
              Attach vendor quotations, invoices, receipts, or official SOA before submitting
            </p>
          </div>
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 ${
          hasError
            ? "bg-red-50 text-red-700 border border-red-300 font-bold"
            : "bg-prime-white text-prime-ink border border-prime-rule"
        }`}>
          {files.length} {files.length === 1 ? "file" : "files"} attached
        </span>
      </div>

      {hasError && (
        <div className="mb-3 p-3 bg-red-50 border border-red-300 text-red-800 text-xs font-semibold flex items-center gap-2.5 animate-pulse">
          <span className="w-2 h-2 rounded-full bg-red-600 shrink-0" />
          <span>Attachment required: Please upload at least one vendor quotation, invoice, or receipt before submitting.</span>
        </div>
      )}

      {/* Dropzone */}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleFileSelection(e.dataTransfer.files);
        }}
        className={`border-2 border-dashed ${
          hasError
            ? "border-prime-rule bg-prime-white hover:border-prime-blue"
            : "border-prime-rule hover:border-prime-gold hover:bg-prime-white"
        } rounded-none p-6 text-center cursor-pointer transition-all`}
      >
        <UploadCloud className="w-8 h-8 text-prime-blue mx-auto mb-2" />
        <p className="text-sm font-medium text-prime-ink">
          Click to upload or drag & drop supporting files here
        </p>
        <p className="text-xs text-prime-ink mt-1">
          Supports PDF, PNG, JPG, and DOCX. Complete submission limit: 4 MB.
        </p>
        {selectionError && <p role="alert" className="mt-2 text-xs text-red-700">{selectionError}</p>}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
          className="hidden"
          onChange={(e) => handleFileSelection(e.target.files)}
        />
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {files.map((file, idx) => (
            <div
              key={file.id || idx}
              className="flex items-center justify-between p-3 rounded-none border border-prime-rule bg-prime-white hover:bg-prime-white transition-colors"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="p-2 bg-prime-white border border-prime-rule text-prime-blue shrink-0">
                  {file.type.includes("image") ? (
                    <ImageIcon className="w-4 h-4" />
                  ) : (
                    <FileText className="w-4 h-4" />
                  )}
                </div>
                <div className="truncate">
                  <p className="text-xs font-medium text-prime-ink truncate" title={file.name}>
                    {file.name}
                  </p>
                  <p className="text-[11px] text-prime-ink font-sans tabular-nums">
                    {formatFileSize(file.size)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0 ml-2">
                {file.dataUrl && (
                  <a
                    href={file.dataUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 text-prime-ink hover:text-prime-ink hover:bg-prime-white transition-colors"
                    title="Preview file"
                  >
                    <Eye className="w-4 h-4" />
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => removeFile(idx)}
                  className="p-1.5 text-prime-ink hover:text-prime-blue hover:bg-prime-white transition-colors cursor-pointer"
                  title="Remove file"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
