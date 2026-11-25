"use client";

import React, { useRef } from "react";
import { InputTab } from "./types";

interface DocumentWorkspaceProps {
  activeTab: InputTab;
  onTabChange: (tab: InputTab) => void;
  documentText: string;
  onTextChange: (text: string) => void;
  selectedFile: File | null;
  onFileSelect: (file: File) => void;
  onFileRemove: () => void;
  onLoadSample: (type: "internship" | "rental") => void;
  onClear: () => void;
  onSubmit: () => void;
  loading: boolean;
  error: string | null;
  isStale: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}

export function DocumentWorkspace({
  activeTab,
  onTabChange,
  documentText,
  onTextChange,
  selectedFile,
  onFileSelect,
  onFileRemove,
  onLoadSample,
  onClear,
  onSubmit,
  loading,
  error,
  isStale,
  textareaRef,
}: DocumentWorkspaceProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);

  const characterCount = documentText.trim().length;
  const isPasteValid = characterCount >= 20;
  const isUploadValid = selectedFile !== null;
  const canScan = activeTab === "upload" ? isUploadValid : isPasteValid;

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0]);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <section
      id="document-workspace"
      className="p-6 sm:p-8 rounded-2xl bg-[#101319] border border-white/[0.08] space-y-6 shadow-2xl"
    >
      {/* Workspace Top Bar: Mode Switcher & Reset */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-4">
        {/* Tab switch */}
        <div
          role="tablist"
          aria-label="Input method selection"
          className="flex items-center gap-1.5 p-1 rounded-xl bg-[#07090D] border border-white/5 w-fit"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "paste"}
            aria-label="Paste text input mode"
            onClick={() => onTabChange("paste")}
            className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors min-h-[36px] ${
              activeTab === "paste"
                ? "bg-[#161B23] text-[#F5F7FA] border border-white/10 shadow-sm"
                : "text-[#ABB5C5] hover:text-[#F5F7FA]"
            }`}
          >
            Paste Text
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "upload"}
            aria-label="Upload document file mode"
            onClick={() => onTabChange("upload")}
            className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors min-h-[36px] ${
              activeTab === "upload"
                ? "bg-[#161B23] text-[#F5F7FA] border border-white/10 shadow-sm"
                : "text-[#ABB5C5] hover:text-[#F5F7FA]"
            }`}
          >
            Upload File
          </button>
        </div>

        {/* Samples & Reset Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-[#738094] mr-1 hidden sm:inline">
            Load sample:
          </span>
          <button
            type="button"
            onClick={() => onLoadSample("internship")}
            aria-label="Load sample internship offer letter"
            className="px-2.5 py-1.5 rounded-lg bg-[#161B23] hover:bg-[#1c222c] text-[#ABB5C5] hover:text-[#F5F7FA] text-xs font-medium border border-white/5 transition-colors min-h-[34px]"
          >
            Internship sample
          </button>
          <button
            type="button"
            onClick={() => onLoadSample("rental")}
            aria-label="Load sample residential rental agreement"
            className="px-2.5 py-1.5 rounded-lg bg-[#161B23] hover:bg-[#1c222c] text-[#ABB5C5] hover:text-[#F5F7FA] text-xs font-medium border border-white/5 transition-colors min-h-[34px]"
          >
            Rental sample
          </button>
          {(documentText.length > 0 || selectedFile !== null) && (
            <button
              type="button"
              onClick={onClear}
              aria-label="Clear document input"
              className="px-2.5 py-1.5 rounded-lg text-xs text-[#738094] hover:text-rose-400 hover:bg-rose-500/10 transition-colors ml-1 min-h-[34px]"
              title="Clear input"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Stale Results Warning Banner */}
      {isStale && (
        <div
          role="alert"
          className="p-3.5 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/25 flex items-start gap-3 text-xs sm:text-sm text-[#F59E0B]"
        >
          <svg
            className="w-4 h-4 shrink-0 mt-0.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <div>
            <strong>Document modified:</strong> The review results below reflect your prior version. Click <strong>Review document</strong> to re-analyze your updated text.
          </div>
        </div>
      )}

      {/* Main Input Area */}
      {activeTab === "paste" ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <label
              htmlFor="document-text"
              className="font-medium text-[#ABB5C5]"
            >
              Document Text (agreement, offer, or lease clauses)
            </label>
            <span
              className={`font-mono ${
                characterCount > 0 && characterCount < 20
                  ? "text-rose-400"
                  : "text-[#738094]"
              }`}
            >
              {characterCount} chars {characterCount < 20 ? "(min. 20 required)" : ""}
            </span>
          </div>

          <textarea
            id="document-text"
            ref={textareaRef}
            rows={10}
            value={documentText}
            onChange={(e) => onTextChange(e.target.value)}
            placeholder="Paste your contract, offer letter, tenancy agreement, or specific clauses here for audit (minimum 20 characters)..."
            className="w-full rounded-xl bg-[#07090D] border border-white/10 p-4 text-sm text-[#F5F7FA] placeholder-[#738094] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6CA8FF] focus-visible:border-transparent transition-all font-mono leading-relaxed resize-y"
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 sm:p-10 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
              isDragging
                ? "border-[#6CA8FF] bg-[#6CA8FF]/5"
                : "border-white/10 bg-[#07090D]/50 hover:border-white/20 hover:bg-[#07090D]"
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf,.docx,.txt"
              className="hidden"
            />
            <div className="w-12 h-12 rounded-xl bg-[#161B23] border border-white/10 flex items-center justify-center text-[#6CA8FF]">
              <svg
                className="w-6 h-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="12" x2="12" y2="18" />
                <line x1="9" y1="15" x2="15" y2="15" />
              </svg>
            </div>

            <div>
              <p className="text-sm font-medium text-[#F5F7FA]">
                Click to browse or drag & drop your document
              </p>
              <p className="text-xs text-[#738094] mt-1">
                Supports text-based .pdf, .docx, or .txt (max 4 MB)
              </p>
            </div>
          </div>

          {/* Selected File Chip */}
          {selectedFile && (
            <div className="p-3.5 rounded-xl bg-[#161B23] border border-white/10 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-[#6CA8FF]/15 text-[#6CA8FF] flex items-center justify-center font-bold text-xs uppercase shrink-0">
                  {selectedFile.name.split(".").pop() || "DOC"}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-[#F5F7FA] truncate">
                    {selectedFile.name}
                  </div>
                  <div className="text-xs text-[#738094]">
                    {formatFileSize(selectedFile.size)}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onFileRemove();
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="p-1.5 rounded-lg text-[#738094] hover:text-white hover:bg-white/10 transition-colors"
                title="Remove file"
                aria-label="Remove uploaded file"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          )}

          {/* Scanned PDF Disclosure */}
          <div className="p-3 rounded-xl bg-[#161B23]/50 border border-white/5 text-xs text-[#738094]">
            <strong>Note on PDF uploads:</strong> VetoAI supports text-based PDFs. Scanned photo/image PDFs without selectable text are not supported.
          </div>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div
          role="alert"
          aria-live="assertive"
          className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-start gap-3 text-xs sm:text-sm text-rose-300"
        >
          <svg className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <div className="space-y-1">
            <div className="font-semibold text-rose-200">Unable to analyze document</div>
            <div>{error}</div>
          </div>
        </div>
      )}

      {/* Privacy Notice & Submit Button */}
      <div className="space-y-4 pt-2">
        <button
          type="button"
          onClick={onSubmit}
          aria-label={loading ? "Analyzing document, please wait" : "Review document for unfair clauses"}
          disabled={!canScan || loading}
          className={`w-full py-3.5 px-6 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 min-h-[48px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D2F54B] focus-visible:ring-offset-2 focus-visible:ring-offset-[#101319] ${
            !canScan || loading
              ? "bg-white/5 text-[#738094] cursor-not-allowed border border-white/5"
              : "bg-[#D2F54B] text-[#07090D] hover:bg-[#bde038] shadow-lg shadow-[#D2F54B]/10 active:scale-[0.99]"
          }`}
        >
          {loading ? (
            <>
              <div className="w-4 h-4 rounded-full border-2 border-[#07090D] border-t-transparent animate-spin motion-reduce:animate-none" />
              <span>Reviewing your document…</span>
            </>
          ) : (
            <>
              <span>Review document</span>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </>
          )}
        </button>

        {/* Accurate Privacy Notice */}
        <p className="text-center text-xs text-[#738094] leading-relaxed">
          Remove sensitive personal details before submitting. Document text is sent to our AI provider for analysis.
        </p>
      </div>
    </section>
  );
}
