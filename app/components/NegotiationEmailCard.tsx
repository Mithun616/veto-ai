"use client";

import React, { useState, useMemo } from "react";
import { NegotiationEmail } from "./types";

interface NegotiationEmailCardProps {
  email: NegotiationEmail;
  userName?: string | null;
  isStale?: boolean;
}

export function NegotiationEmailCard({
  email,
  userName,
  isStale = false,
}: NegotiationEmailCardProps) {
  const [copied, setCopied] = useState(false);

  // Automatically personalize email with signed-in user name
  const formattedBody = useMemo(() => {
    if (!userName || !userName.trim()) return email.body;
    const name = userName.trim();
    let text = email.body;
    if (/\[Your Name\]/i.test(text)) {
      text = text.replace(/\[Your Name\]/gi, name);
    } else if (/\[Name\]/i.test(text)) {
      text = text.replace(/\[Name\]/gi, name);
    } else if (!text.toLowerCase().includes(name.toLowerCase())) {
      text = `${text}\n\nBest regards,\n${name}`;
    }
    return text;
  }, [email.body, userName]);

  const fullText = `Subject: ${email.subject}\n\n${formattedBody}`;

  const handleCopyEmail = async () => {
    if (isStale) return;
    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(
    email.subject
  )}&body=${encodeURIComponent(formattedBody)}`;

  return (
    <section className="p-6 sm:p-8 rounded-2xl bg-[#101319] border border-white/[0.08] space-y-6">
      {/* Stale warning banner if document was modified */}
      {isStale && (
        <div
          role="alert"
          className="p-3.5 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/25 flex items-start gap-2.5 text-xs text-[#F59E0B]"
        >
          <svg
            className="w-4 h-4 shrink-0 mt-0.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <div>
            <strong>Draft Locked:</strong> The document text in the workspace has been modified since this draft was generated. Re-run analysis above to refresh and unlock your negotiation email.
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#6CA8FF]/10 text-[#6CA8FF] border border-[#6CA8FF]/20 mb-1.5">
            <span>Actionable Counter-Proposal</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#F5F7FA]">
            Negotiation Email Draft
          </h2>
          <p className="text-xs sm:text-sm text-[#ABB5C5]">
            A polite, professional response you can personalize before sending.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            disabled={isStale}
            onClick={handleCopyEmail}
            title={isStale ? "Draft locked: document text changed since analysis" : "Copy email to clipboard"}
            className={`px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D2F54B] min-h-[44px] flex items-center gap-2 ${
              isStale
                ? "bg-[#D2F54B]/30 text-[#07090D]/50 cursor-not-allowed opacity-60"
                : "bg-[#D2F54B] text-[#07090D] hover:bg-[#bde038]"
            }`}
          >
            {copied ? (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                <span>Copied to clipboard!</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                  <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                </svg>
                <span>Copy email</span>
              </>
            )}
          </button>

          {isStale ? (
            <button
              type="button"
              disabled
              title="Draft locked: document text changed since analysis"
              className="px-4 py-2.5 rounded-xl bg-[#161B23]/50 text-[#F5F7FA]/40 font-medium text-xs sm:text-sm border border-white/5 cursor-not-allowed opacity-60 min-h-[44px] flex items-center gap-2"
            >
              <span>Open Gmail draft</span>
              <svg
                className="w-3.5 h-3.5 text-[#6CA8FF]/40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </button>
          ) : (
            <a
              href={gmailUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 rounded-xl bg-[#161B23] text-[#F5F7FA] font-medium text-xs sm:text-sm border border-white/10 hover:border-white/20 hover:bg-[#1a212b] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6CA8FF] min-h-[44px] flex items-center gap-2"
            >
              <span>Open Gmail draft</span>
              <svg
                className="w-3.5 h-3.5 text-[#6CA8FF]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
          )}
        </div>
      </div>

      {/* Subject Line */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-[#738094]">
          Subject Line
        </label>
        <div className="p-3 rounded-xl bg-[#07090D] border border-white/5 font-mono text-xs sm:text-sm text-[#F5F7FA] select-all">
          {email.subject}
        </div>
      </div>

      {/* Body */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-[#738094]">
          Email Body
        </label>
        <div className="p-4 sm:p-5 rounded-xl bg-[#07090D] border border-white/5 text-xs sm:text-sm text-[#ABB5C5] whitespace-pre-wrap leading-relaxed select-all">
          {formattedBody}
        </div>
      </div>
    </section>
  );
}
