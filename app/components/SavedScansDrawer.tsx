"use client";

import React from "react";
import type { SavedScan } from "@/lib/firebase";

interface SavedScansDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  scans: SavedScan[];
  onSelectScan: (scan: SavedScan) => void;
}

export function SavedScansDrawer({
  isOpen,
  onClose,
  scans,
  onSelectScan,
}: SavedScansDrawerProps) {
  if (!isOpen) return null;

  const formatDate = (isoString: string): string => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  const getRiskBadge = (risk: string, score: number) => {
    switch (risk) {
      case "High":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-500/15 text-red-300 border border-red-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            High ({score})
          </span>
        );
      case "Medium":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Medium ({score})
          </span>
        );
      case "Low":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            Low ({score})
          </span>
        );
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Saved Scans History"
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm transition-opacity"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#07090D] border-l border-white/10 h-full flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-white/[0.08] bg-[#101319] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#161B23] border border-white/10 flex items-center justify-center text-[#6CA8FF]">
              <svg
                className="w-3.5 h-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#F5F7FA]">
                Saved Scans History
              </h2>
              <p className="text-[11px] text-[#738094]">
                {scans.length} {scans.length === 1 ? "audit" : "audits"} saved in your account
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close scan history"
            className="p-1.5 rounded-lg text-[#738094] hover:text-white hover:bg-white/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6CA8FF]"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Scans List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {scans.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-[#101319] border border-white/5 mx-auto flex items-center justify-center text-[#738094]">
                <svg
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              </div>
              <p className="text-xs sm:text-sm font-medium text-[#ABB5C5]">
                No saved scans yet
              </p>
              <p className="text-[11px] text-[#738094] max-w-xs mx-auto">
                Documents you scan while signed in will automatically appear here for one-click review.
              </p>
            </div>
          ) : (
            scans.map((scan) => (
              <div
                key={scan.id}
                onClick={() => onSelectScan(scan)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectScan(scan);
                  }
                }}
                className="p-3.5 rounded-xl bg-[#101319] hover:bg-[#161B23] border border-white/[0.08] hover:border-white/20 transition-all cursor-pointer space-y-2 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6CA8FF]"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-xs sm:text-sm font-semibold text-[#F5F7FA] group-hover:text-[#6CA8FF] transition-colors truncate">
                    {scan.title}
                  </h3>
                  {getRiskBadge(scan.overallRisk, scan.riskScore)}
                </div>

                {scan.summary && (
                  <p className="text-[11px] text-[#ABB5C5] line-clamp-2 leading-relaxed">
                    {scan.summary}
                  </p>
                )}

                <div className="flex items-center justify-between text-[10px] text-[#738094] pt-1 border-t border-white/5">
                  <span>{formatDate(scan.createdAt)}</span>
                  <span className="text-[#6CA8FF] group-hover:underline flex items-center gap-1">
                    Load scan →
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
