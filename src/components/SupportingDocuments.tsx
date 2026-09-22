"use client";

import React, { useEffect, useRef, useState } from "react";
import { Paperclip, UploadCloud, Trash2, FileText, Image as ImageIcon, Eye } from "lucide-react";
import { SupportingFile } from "@/types/rfp";
import { MAX_UPLOAD_FILE_BYTES } from "@/lib/submissionUploads";

interface SupportingDocumentsProps {
  files: SupportingFile[];
  onFilesChange: (files: SupportingFile[]) => void;
  rawFiles: File[];
  onRawFilesChange: (rawFiles: File[]) => void;
  hasError?: boolean;
  selectedDocumentTypes?: string[];
}

export function SupportingDocuments({
  files,
  onFilesChange,
  rawFiles,
  onRawFilesChange,
  hasError = false,
  selectedDocumentTypes = [],
}: SupportingDocumentsProps) {
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [selectionError, setSelectionError] = useState<string | null>(null);

  useEffect(() => {
    const allowedTypes = new Set(selectedDocumentTypes);
    const retainedIndexes = files
      .map((file, index) => ({ file, index }))
      .filter(({ file }) => file.documentType && allowedTypes.has(file.documentType));
    if (retainedIndexes.length !== files.length) {
      onFilesChange(retainedIndexes.map(({ file }) => file));
      onRawFilesChange(retainedIndexes.map(({ index }) => rawFiles[index]).filter(Boolean));
    }
  }, [selectedDocumentTypes.join("|")]);

  const handleFileSelection = (documentType: string, selectedFiles: FileList | null) => {
    if (!selectedFiles || selectedFiles.length === 0) return;

    const file = selectedFiles[0];
    const oversized = file.size > MAX_UPLOAD_FILE_BYTES;
    if (oversized) {
      setSelectionError(`${file.name} exceeds the 4 MB submission limit and cannot be attached.`);
      return;
    }
    const existingIndex = files.findIndex((item) => item.documentType === documentType);
    const updatedRaw = [...rawFiles];
    if (existingIndex >= 0) updatedRaw[existingIndex] = file;
    else updatedRaw.push(file);
    if (updatedRaw.reduce((total, file) => total + file.size, 0) > MAX_UPLOAD_FILE_BYTES) {
      setSelectionError("The combined supporting files exceed the 4 MB submission limit.");
      return;
    }
    setSelectionError(null);
    onRawFilesChange(updatedRaw);

    const reader = new FileReader();
    reader.onload = (e) => {
      const newItem: SupportingFile = {
        id: existingIndex >= 0 ? files[existingIndex].id : Math.random().toString(36).substring(2, 9),
        name: file.name,
        size: file.size,
        type: file.type,
        dataUrl: e.target?.result as string,
        documentType,
      };
      if (existingIndex >= 0) {
        onFilesChange(files.map((item, index) => index === existingIndex ? newItem : item));
      } else {
        onFilesChange([...files, newItem]);
      }
    };
    reader.readAsDataURL(file);
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
        <div className="flex flex-wrap items-center justify-end gap-2">
          {selectedDocumentTypes.length > 0 && (
            <div className="flex flex-wrap items-center justify-end gap-1.5" aria-live="polite">
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-prime-ink/70">Selected document types</span>
              <div className="flex flex-wrap gap-1.5" role="list" aria-label="Selected supporting documents">
                {selectedDocumentTypes.map((documentType) => (
                  <span key={documentType} role="listitem" className="border border-prime-gold/60 bg-prime-gold/10 px-2 py-0.5 text-[10px] font-bold text-prime-blue">
                    {documentType}
                  </span>
                ))}
              </div>
            </div>
          )}
          <span className={`text-xs font-medium px-2.5 py-1 ${
            hasError
              ? "bg-red-50 text-red-700 border border-red-300 font-bold"
              : "bg-prime-white text-prime-ink border border-prime-rule"
          }`}>
            {files.length} {files.length === 1 ? "file" : "files"} attached
          </span>
        </div>
      </div>

      {hasError && (
        <div className="mb-3 p-3 bg-red-50 border border-red-300 text-red-800 text-xs font-semibold flex items-center gap-2.5 animate-pulse">
          <span className="w-2 h-2 rounded-full bg-red-600 shrink-0" />
          <span>Attachment required: Please upload at least one vendor quotation, invoice, or receipt before submitting.</span>
        </div>
      )}

      {selectedDocumentTypes.length === 0 ? (
        <div className="border border-dashed border-prime-rule p-6 text-center text-sm text-prime-ink">
          Select the document types attached in the form above to create their upload boxes here.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {selectedDocumentTypes.map((documentType) => {
            const file = files.find((item) => item.documentType === documentType);
            const inputKey = documentType.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
            return (
              <div
                key={documentType}
                onClick={() => fileInputRefs.current[inputKey]?.click()}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={(e) => { e.preventDefault(); e.stopPropagation(); handleFileSelection(documentType, e.dataTransfer.files); }}
                className={`border-2 border-dashed ${file ? "border-prime-gold bg-prime-gold/5" : "border-prime-rule hover:border-prime-gold hover:bg-prime-white"} rounded-none p-4 text-left cursor-pointer transition-all`}
              >
                <div className="flex items-start gap-3">
                  <UploadCloud className="w-6 h-6 text-prime-blue shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-prime-blue">{documentType}</p>
                    <p className="mt-1 text-xs font-medium text-prime-ink truncate">
                      {file ? file.name : "Click to upload or drag & drop this document"}
                    </p>
                    {file && <p className="text-[11px] text-prime-ink">{formatFileSize(file.size)} · ready</p>}
                    {!file && <p className="text-[11px] text-prime-ink mt-1">PDF, PNG, JPG, or DOCX</p>}
                  </div>
                  {file && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeFile(files.indexOf(file)); }}
                      className="ml-auto p-1.5 text-prime-ink hover:text-prime-blue"
                      title={`Remove ${documentType}`}
                      aria-label={`Remove ${documentType}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <input
                  ref={(element) => { fileInputRefs.current[inputKey] = element; }}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                  className="hidden"
                  onChange={(e) => { handleFileSelection(documentType, e.target.files); e.currentTarget.value = ""; }}
                />
              </div>
            );
          })}
        </div>
      )}
      {selectionError && <p role="alert" className="mt-2 text-xs text-red-700">{selectionError}</p>}

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
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-prime-blue">{file.documentType || "Supporting document"}</label>
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
