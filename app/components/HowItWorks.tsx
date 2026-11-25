"use client";

import React from "react";

export function HowItWorks() {
  const steps = [
    {
      number: "01",
      title: "Input or upload",
      description:
        "Paste text or upload a text-based PDF, DOCX, or TXT file (up to 4 MB). Clear sensitive personal details before analyzing.",
      badge: "Text or Document",
    },
    {
      number: "02",
      title: "Audit risks & omissions",
      description:
        "VetoAI scans for one-sided penalties, overreaching IP grants, and compares text against missing fair-practice protections.",
      badge: "Plain-English Findings",
    },
    {
      number: "03",
      title: "Draft polite pushback",
      description:
        "Review specific counter-language for each flagged clause and export a respectful email draft to negotiate calmly.",
      badge: "Actionable Draft",
    },
  ];

  return (
    <section id="how-it-works" className="py-12 border-t border-white/[0.08]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#161B23] border border-white/10 text-[#6CA8FF] mb-3">
            <span>How it works</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F5F7FA]">
            Clear review in three straightforward steps
          </h2>
          <p className="text-sm sm:text-base text-[#ABB5C5] mt-2">
            Designed for freshers, renters, freelancers, and students navigating unstandardized contracts.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((step) => (
            <div
              key={step.number}
              className="p-6 rounded-2xl bg-[#101319] border border-white/[0.08] relative flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-2xl font-bold text-[#6CA8FF]/70 font-mono">
                    {step.number}
                  </span>
                  <span className="text-[11px] font-medium text-[#ABB5C5] bg-[#161B23] px-2.5 py-1 rounded-full border border-white/5">
                    {step.badge}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-[#F5F7FA] mb-2">
                  {step.title}
                </h3>
                <p className="text-xs sm:text-sm text-[#ABB5C5] leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
