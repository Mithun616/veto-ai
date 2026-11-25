"use client";

import React, { useState } from "react";
import { MissingProtection } from "./types";

interface MissingProtectionCardProps {
  protection: MissingProtection;
  id: string;
  index: number;
}

export function MissingProtectionCard({
  protection,
  id,
  index,
}: MissingProtectionCardProps) {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleCopyAsk = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(protection.askFor);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const detailsId = `protection-details-${id}`;

  return (
    <article
      className={`rounded-2xl bg-[#101319] border transition-all ${
        isExpanded
          ? "border-[#F59E0B]/35 shadow-lg"
          : "border-[#F59E0B]/20 hover:border-[#F59E0B]/30"
      }`}
    >
      {/* Clickable Header */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-4 sm:p-5 cursor-pointer space-y-2.5 select-none focus-within:ring-2 focus-within:ring-[#6CA8FF] rounded-2xl"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 min-w-0">
            <span className="text-[11px] font-mono text-[#F59E0B] bg-[#F59E0B]/10 px-2 py-0.5 rounded border border-[#F59E0B]/20 shrink-0">
              Missing #{index + 1}
            </span>

            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/25">
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
                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
              </svg>
              <span>Absent protection</span>
            </span>

            <h4 className="text-sm sm:text-base font-semibold text-[#F5F7FA] tracking-tight">
              {protection.title}
            </h4>
          </div>

          {/* Expand / Collapse Action */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            aria-expanded={isExpanded}
            aria-controls={detailsId}
            aria-label={`${isExpanded ? "Hide" : "View"} suggested addition for ${
              protection.title
            }`}
            className="text-xs text-[#F59E0B] hover:text-[#fbbf24] font-medium flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F59E0B] rounded-md px-2 py-1 min-h-[36px] shrink-0 transition-colors"
          >
            <span>{isExpanded ? "Hide suggestion" : "View suggestion"}</span>
            <svg
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                isExpanded ? "rotate-180" : ""
              }`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>

        {/* Concise explanation */}
        <p className="text-xs sm:text-sm text-[#ABB5C5] leading-relaxed select-text">
          {protection.whyItMatters}
        </p>
      </div>

      {/* Expandable Suggested Request / Addition */}
      {isExpanded && (
        <div
          id={detailsId}
          role="region"
          aria-label={`Suggested addition for ${protection.title}`}
          className="px-4 pb-5 sm:px-5 sm:pb-6 space-y-3 border-t border-white/[0.06] pt-4 select-text"
        >
          <div className="p-3.5 rounded-xl bg-[#161B23] border border-white/5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#F59E0B]">
                Suggested addition / request:
              </span>
              <button
                type="button"
                onClick={handleCopyAsk}
                className="text-xs text-[#ABB5C5] hover:text-white flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6CA8FF] rounded px-2 py-1 min-h-[32px] transition-colors"
                aria-label={`Copy suggested addition for ${protection.title}`}
              >
                {copied ? (
                  <span
                    role="status"
                    aria-live="polite"
                    className="text-[#D2F54B] font-medium flex items-center gap-1"
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      aria-hidden="true"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                    Copied
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <svg
                      className="w-3.5 h-3.5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden="true"
                    >
                      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                    </svg>
                    Copy clause
                  </span>
                )}
              </button>
            </div>
            <p className="text-xs sm:text-sm text-[#F5F7FA] font-medium leading-relaxed">
              &ldquo;{protection.askFor}&rdquo;
            </p>
          </div>
        </div>
      )}
    </article>
  );
}
