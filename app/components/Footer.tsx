"use client";

import React from "react";

export function Footer() {
  return (
    <footer className="w-full border-t border-white/[0.08] bg-[#07090D] py-10 mt-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-[#161B23] border border-white/10 flex items-center justify-center text-[#D2F54B]">
              <svg
                className="w-3.5 h-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-[#F5F7FA]">
              VetoAI
            </span>
            <span className="text-xs text-[#738094]">
              — Document risk review and pushback drafts
            </span>
          </div>

          <div className="flex items-center gap-6 text-xs text-[#738094]">
            <a href="#how-it-works" className="hover:text-[#ABB5C5] transition-colors">
              How it works
            </a>
            <a href="#document-workspace" className="hover:text-[#ABB5C5] transition-colors">
              Review tool
            </a>
          </div>
        </div>

        {/* Clear Educational Disclaimer */}
        <div className="p-4 rounded-xl bg-[#101319] border border-white/5 text-xs text-[#738094] leading-relaxed">
          <strong className="text-[#ABB5C5] font-medium">Important Educational Disclaimer:</strong> VetoAI is an automated review assistant designed to promote negotiation awareness and contract readability for students, tenants, and consumers. It does not provide legal representation, legal advice, or attorney-client confidentiality. Always consult an attorney licensed in your jurisdiction for binding legal matters.
        </div>
      </div>
    </footer>
  );
}
