"use client";

import React from "react";

export function AnalysisLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="w-full my-8 p-8 sm:p-12 rounded-2xl bg-[#101319] border border-white/[0.08] flex flex-col items-center justify-center text-center space-y-4"
    >
      <div className="relative flex items-center justify-center">
        {/* Spinner ring */}
        <div className="w-12 h-12 rounded-full border-2 border-white/10 border-t-[#D2F54B] animate-spin motion-reduce:animate-none" />
        <div className="absolute w-6 h-6 rounded-full bg-[#161B23] border border-white/10 flex items-center justify-center">
          <span className="w-2 h-2 rounded-full bg-[#6CA8FF] animate-soft-pulse motion-reduce:animate-none" />
        </div>
      </div>

      <div className="space-y-1.5 max-w-sm">
        <h3 className="text-base font-semibold text-[#F5F7FA]">
          Reviewing your document…
        </h3>
        <p className="text-xs sm:text-sm text-[#ABB5C5]">
          Auditing clauses against standard fairness criteria and preparing pushback suggestions.
        </p>
      </div>

      <div className="text-[11px] text-[#738094] pt-2">
        This usually takes 4–8 seconds.
      </div>
    </div>
  );
}
