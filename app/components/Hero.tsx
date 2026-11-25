"use client";

import React from "react";

interface HeroProps {
  onReviewClick: () => void;
  onTrySampleClick: () => void;
}

export function Hero({ onReviewClick, onTrySampleClick }: HeroProps) {
  return (
    <section className="relative pt-12 pb-10 sm:pt-16 sm:pb-14">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Main Headline & Supporting Text */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-[#161B23] border border-white/10 text-[#6CA8FF]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D2F54B]" />
              <span>Document Risk & Fairness Review</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-bold tracking-tight text-[#F5F7FA] leading-[1.12]">
              Spot hidden risks. <br />
              <span className="text-[#6CA8FF]">Sign with clarity.</span>
            </h1>

            <p className="text-base sm:text-lg text-[#ABB5C5] max-w-xl mx-auto lg:mx-0 leading-relaxed">
              Review offers, leases, and terms for concerning clauses and
              missing protections—then draft a respectful response.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 sm:gap-4 pt-2">
              <button
                type="button"
                onClick={onReviewClick}
                className="px-6 py-3 rounded-xl bg-[#D2F54B] text-[#07090D] font-semibold text-sm hover:bg-[#bde038] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D2F54B] focus-visible:ring-offset-2 focus-visible:ring-offset-[#07090D] shadow-sm flex items-center gap-2 min-h-[44px]"
              >
                <span>Review a document</span>
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </button>

              <button
                type="button"
                onClick={onTrySampleClick}
                className="px-5 py-3 rounded-xl bg-[#101319] hover:bg-[#161B23] text-[#F5F7FA] font-medium text-sm border border-white/10 hover:border-white/20 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6CA8FF] min-h-[44px]"
              >
                Try a sample
              </button>
            </div>
          </div>

          {/* Value Summary Visual / Key Pillars */}
          <div className="lg:col-span-5">
            <div className="bg-[#101319] border border-white/[0.08] rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl">
              <div className="text-xs font-semibold uppercase tracking-wider text-[#738094]">
                What VetoAI audits
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-[#161B23]/70 border border-white/5">
                  <div className="w-8 h-8 rounded-lg bg-[#D2F54B]/10 border border-[#D2F54B]/20 flex items-center justify-center text-[#D2F54B] shrink-0 mt-0.5">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-[#F5F7FA]">Concerning Clauses</div>
                    <div className="text-xs text-[#ABB5C5] mt-0.5">
                      Exit bonds, unreasonable notice periods, deposit forfeiture, and overbroad IP terms.
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-[#161B23]/70 border border-white/5">
                  <div className="w-8 h-8 rounded-lg bg-[#F59E0B]/10 border border-[#F59E0B]/20 flex items-center justify-center text-[#F59E0B] shrink-0 mt-0.5">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-[#F5F7FA]">Missing Protections</div>
                    <div className="text-xs text-[#ABB5C5] mt-0.5">
                      Standard rights not found in text: deposit refund timelines, cure periods, mutual termination.
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-[#161B23]/70 border border-white/5">
                  <div className="w-8 h-8 rounded-lg bg-[#6CA8FF]/10 border border-[#6CA8FF]/20 flex items-center justify-center text-[#6CA8FF] shrink-0 mt-0.5">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="20" height="16" x="2" y="4" rx="2" />
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-[#F5F7FA]">Respectful Negotiation Script</div>
                    <div className="text-xs text-[#ABB5C5] mt-0.5">
                      Polite, ready-to-send counter-proposals to request reasonable adjustments.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
