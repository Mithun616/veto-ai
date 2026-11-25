"use client";

import React, { useState } from "react";
import { FlaggedClause } from "./types";

interface ClauseCardProps {
  clause: FlaggedClause;
  index: number;
}

export function ClauseCard({ clause, index }: ClauseCardProps) {
  const [copied, setCopied] = useState(false);
  const [quoteExpanded, setQuoteExpanded] = useState(false);

  const handleCopyPushback = async () => {
    try {
      await navigator.clipboard.writeText(clause.negotiationLine);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Severity badges
  const getSeverityBadge = () => {
    switch (clause.risk) {
      case "High":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#D2F54B]/15 text-[#D2F54B] border border-[#D2F54B]/30">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D2F54B]" />
            High Severity
          </span>
        );
      case "Medium":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#6CA8FF]/15 text-[#6CA8FF] border border-[#6CA8FF]/30">
            <span className="w-1.5 h-1.5 rounded-full bg-[#6CA8FF]" />
            Medium Severity
          </span>
        );
      case "Low":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/5 text-[#ABB5C5] border border-white/10">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ABB5C5]" />
            Low Severity
          </span>
        );
    }
  };

  return (
    <article className="p-5 sm:p-6 rounded-2xl bg-[#101319] border border-white/[0.08] space-y-4 hover:border-white/15 transition-colors">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-mono text-[#738094] bg-[#161B23] px-2 py-0.5 rounded border border-white/5">
            Clause #{index + 1}
          </span>
          <h3 className="text-base sm:text-lg font-semibold text-[#F5F7FA]">
            {clause.title}
          </h3>
        </div>
        {getSeverityBadge()}
      </div>

      {/* Source excerpt */}
      <div className="rounded-xl bg-[#07090D] border border-white/5 p-3.5 space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-[#738094]">
          <span>Source excerpt:</span>
          {clause.quote && clause.quote.length > 140 && (
            <button
              type="button"
              onClick={() => setQuoteExpanded(!quoteExpanded)}
              className="text-[#6CA8FF] hover:underline text-[11px] font-normal"
            >
              {quoteExpanded ? "Collapse" : "Show full"}
            </button>
          )}
        </div>
        <p className={`text-xs sm:text-sm text-[#ABB5C5] italic font-mono leading-relaxed ${!quoteExpanded && clause.quote?.length > 140 ? "line-clamp-2" : ""}`}>
          &ldquo;{clause.quote || "Specific clause text identified in the document."}&rdquo;
        </p>
      </div>

      {/* Why it matters */}
      <div className="space-y-1">
        <div className="text-xs font-semibold uppercase tracking-wider text-[#738094]">
          Why it matters:
        </div>
        <p className="text-xs sm:text-sm text-[#F5F7FA] leading-relaxed">
          {clause.whyItMatters}
        </p>
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
            className="text-xs text-[#ABB5C5] hover:text-white flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6CA8FF] rounded px-2 py-1 min-h-[32px]"
            aria-label="Copy suggested pushback"
          >
            {copied ? (
              <span className="text-[#D2F54B] font-medium flex items-center gap-1">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                Copied
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
    </article>
  );
}
