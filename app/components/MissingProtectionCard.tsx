"use client";

import React, { useState } from "react";
import { MissingProtection } from "./types";

interface MissingProtectionCardProps {
  protection: MissingProtection;
  index: number;
}

export function MissingProtectionCard({
  protection,
  index,
}: MissingProtectionCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyAsk = async () => {
    try {
      await navigator.clipboard.writeText(protection.askFor);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <article className="p-5 sm:p-6 rounded-2xl bg-[#101319] border border-[#F59E0B]/20 space-y-4 hover:border-[#F59E0B]/35 transition-colors">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-mono text-[#F59E0B] bg-[#F59E0B]/10 px-2 py-0.5 rounded border border-[#F59E0B]/20">
            Missing #{index + 1}
          </span>
          <h3 className="text-base sm:text-lg font-semibold text-[#F5F7FA]">
            {protection.title}
          </h3>
        </div>

        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/25">
          <svg
            className="w-3.5 h-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
          </svg>
          Absent Protection
        </span>
      </div>

      {/* Why it matters */}
      <div className="space-y-1">
        <div className="text-xs font-semibold uppercase tracking-wider text-[#738094]">
          Why it matters:
        </div>
        <p className="text-xs sm:text-sm text-[#ABB5C5] leading-relaxed">
          {protection.whyItMatters}
        </p>
      </div>

      {/* Suggested addition */}
      <div className="p-3.5 rounded-xl bg-[#161B23] border border-white/5 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#F59E0B]">
            Suggested addition:
          </span>
          <button
            type="button"
            onClick={handleCopyAsk}
            className="text-xs text-[#ABB5C5] hover:text-white flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6CA8FF] rounded px-2 py-1 min-h-[32px]"
            aria-label="Copy suggested addition"
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
                Copy clause
              </span>
            )}
          </button>
        </div>
        <p className="text-xs sm:text-sm text-[#F5F7FA] font-medium leading-relaxed">
          &ldquo;{protection.askFor}&rdquo;
        </p>
      </div>
    </article>
  );
}
