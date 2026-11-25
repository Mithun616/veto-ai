"use client";

import React from "react";
import Link from "next/link";

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/[0.08] bg-[#07090D]/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-white font-semibold tracking-tight hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6CA8FF] rounded-lg p-1"
            aria-label="VetoAI home"
          >
            <div className="w-8 h-8 rounded-lg bg-[#161B23] border border-white/10 flex items-center justify-center text-[#D2F54B] shadow-inner">
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </div>
            <span className="text-lg font-bold tracking-tight text-[#F5F7FA]">
              Veto<span className="text-[#6CA8FF]">AI</span>
            </span>
          </Link>
        </div>

        {/* Navigation & Educational Badge */}
        <div className="flex items-center gap-3 sm:gap-5">
          <a
            href="#how-it-works"
            className="text-xs sm:text-sm text-[#ABB5C5] hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6CA8FF] rounded-md px-2.5 py-1.5"
          >
            How it works
          </a>

          <div
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#161B23] text-[#ABB5C5] border border-white/10"
            role="note"
            aria-label="Educational disclaimer"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#6CA8FF]" aria-hidden="true" />
            <span>Educational review · Not legal advice</span>
          </div>
        </div>
      </div>
    </header>
  );
}
