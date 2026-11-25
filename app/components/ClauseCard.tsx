"use client";

import React, { useState } from "react";
import { FlaggedClause } from "./types";
import { getNormalizedSeverity } from "./ClauseOverview";

interface ClauseCardProps {
  clause: FlaggedClause;
  id: string;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
}

export function ClauseCard({
  clause,
  id,
  index,
  isExpanded,
  onToggle,
}: ClauseCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyPushback = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(clause.negotiationLine);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const severity = getNormalizedSeverity(clause.risk);

  // Consistent severity indicators (Icon + Text + Color, NO green checkmarks)
  const renderSeverityBadge = () => {
    switch (severity) {
      case "High":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/15 text-red-300 border border-red-500/30">
            <svg
              className="w-3.5 h-3.5 text-red-400 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span>High concern</span>
          </span>
        );
      case "Medium":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <svg
              className="w-3.5 h-3.5 text-amber-400 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>Medium concern</span>
          </span>
        );
      case "Low":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/30">
            <svg
              className="w-3.5 h-3.5 text-blue-400 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <span>Low concern</span>
          </span>
        );
      case "Unrated":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-500/15 text-zinc-300 border border-zinc-500/30">
            <svg
              className="w-3.5 h-3.5 text-zinc-400 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
            <span>Unrated</span>
          </span>
        );
    }
  };

  const detailsId = `clause-details-${id}`;

  return (
    <article
      className={`rounded-2xl bg-[#101319] border transition-all ${
        isExpanded
          ? "border-white/20 shadow-lg"
          : "border-white/[0.08] hover:border-white/15"
      }`}
    >
      {/* Clickable Card Header */}
      <div
        onClick={onToggle}
        className="p-4 sm:p-5 cursor-pointer space-y-2.5 select-none focus-within:ring-2 focus-within:ring-[#6CA8FF] rounded-2xl"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 min-w-0">
            <span className="text-[11px] font-mono text-[#738094] bg-[#161B23] px-2 py-0.5 rounded border border-white/5 shrink-0">
              #{index + 1}
            </span>
            {renderSeverityBadge()}
            <h4 className="text-sm sm:text-base font-semibold text-[#F5F7FA] tracking-tight">
              {clause.title}
            </h4>
          </div>

          {/* Action button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            aria-expanded={isExpanded}
            aria-controls={detailsId}
            aria-label={`${isExpanded ? "Collapse" : "Expand"} details for ${
              clause.title
            }`}
            className="text-xs text-[#6CA8FF] hover:text-white font-medium flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6CA8FF] rounded-md px-2 py-1 min-h-[36px] shrink-0 transition-colors"
          >
            <span>{isExpanded ? "Hide details" : "View details"}</span>
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

        {/* Short, plain-English consequence (collapsed summary) */}
        {!isExpanded && (
          <p className="text-xs sm:text-sm text-[#ABB5C5] leading-relaxed line-clamp-2 select-text">
            {clause.whyItMatters}
          </p>
        )}
      </div>

      {/* Expanded Details Section */}
      {isExpanded && (
        <div
          id={detailsId}
          role="region"
          aria-label={`Detailed findings for ${clause.title}`}
          className="px-4 pb-5 sm:px-5 sm:pb-6 space-y-4 border-t border-white/[0.06] pt-4 select-text"
        >
          {/* Why it matters (full text) */}
          <div className="space-y-1">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#738094]">
              Why it matters:
            </div>
            <p className="text-xs sm:text-sm text-[#F5F7FA] leading-relaxed">
              {clause.whyItMatters}
            </p>
          </div>

          {/* Source excerpt */}
          <div className="rounded-xl bg-[#07090D] border border-white/5 p-3.5 space-y-1.5">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#738094]">
              Source excerpt:
            </div>
            <blockquote className="text-xs sm:text-sm text-[#ABB5C5] italic font-mono leading-relaxed pl-1 border-l-2 border-[#6CA8FF]/40">
              &ldquo;{clause.quote || "Specific clause text identified in the document."}&rdquo;
            </blockquote>
          </div>

          {/* Suggested pushback */}
          <div className="p-3.5 rounded-xl bg-[#161B23] border border-white/5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#6CA8FF]">
                Suggested pushback:
              </span>
              <button
                type="button"
                onClick={handleCopyPushback}
                className="text-xs text-[#ABB5C5] hover:text-white flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6CA8FF] rounded px-2 py-1 min-h-[32px] transition-colors"
                aria-label={`Copy suggested pushback for ${clause.title}`}
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
                    Copy line
                  </span>
                )}
              </button>
            </div>
            <p className="text-xs sm:text-sm text-[#D2F54B] font-medium leading-relaxed">
              &ldquo;{clause.negotiationLine}&rdquo;
            </p>
          </div>
        </div>
      )}
    </article>
  );
}
