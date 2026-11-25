"use client";

import React from "react";
import { AnalysisResult } from "./types";

interface RiskOverviewProps {
  result: AnalysisResult;
}

export function RiskOverview({ result }: RiskOverviewProps) {
  const { overallRisk, riskScore, summary, flaggedClauses, missingProtections } = result;

  const getRiskMeta = () => {
    switch (overallRisk) {
      case "High":
        return {
          pill: "bg-red-500/15 text-red-300 border-red-500/30",
          barColor: "#EF4444",
          title: "High Risk Document",
          label: "Significant concerning terms identified",
        };
      case "Medium":
        return {
          pill: "bg-amber-500/15 text-amber-300 border-amber-500/30",
          barColor: "#F59E0B",
          title: "Moderate Risk Document",
          label: "Revisions recommended before signing",
        };
      case "Low":
      default:
        return {
          pill: "bg-blue-500/15 text-blue-300 border-blue-500/30",
          barColor: "#6CA8FF",
          title: "Low Risk Document",
          label: "Generally balanced standard terms",
        };
    }
  };

  const meta = getRiskMeta();

  return (
    <section className="p-6 sm:p-8 rounded-2xl bg-[#101319] border border-white/[0.08] space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${meta.pill}`}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: meta.barColor }}
              />
              {overallRisk} Risk ({riskScore} / 100)
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#F5F7FA]">
            {meta.title}
          </h2>
          <p className="text-xs sm:text-sm text-[#ABB5C5]">
            {meta.label}
          </p>
        </div>

        {/* Quick count chips */}
        <div className="flex items-center gap-2.5">
          <div className="px-3 py-2 rounded-xl bg-[#161B23] border border-white/5 text-center min-w-[100px]">
            <div className="text-lg font-bold text-[#F5F7FA]">
              {flaggedClauses?.length ?? 0}
            </div>
            <div className="text-[11px] text-[#738094] uppercase tracking-wider font-medium">
              Flagged
            </div>
          </div>
          <div className="px-3 py-2 rounded-xl bg-[#161B23] border border-[#F59E0B]/20 text-center min-w-[100px]">
            <div className="text-lg font-bold text-[#F59E0B]">
              {missingProtections?.length ?? 0}
            </div>
            <div className="text-[11px] text-[#F59E0B]/80 uppercase tracking-wider font-medium">
              Missing
            </div>
          </div>
        </div>
      </div>

      {/* Visual Risk Gauge Meter */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[#738094] font-medium">Risk Score Meter</span>
          <span className="font-mono font-semibold text-[#F5F7FA]">
            {riskScore} <span className="text-[#738094]">/ 100</span>
          </span>
        </div>
        <div
          role="meter"
          aria-valuenow={riskScore}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Overall document risk score: ${riskScore} out of 100, classified as ${overallRisk} Risk`}
          className="w-full h-2.5 bg-[#07090D] rounded-full overflow-hidden border border-white/5 p-0.5"
        >
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${Math.min(Math.max(riskScore, 4), 100)}%`,
              backgroundColor: meta.barColor,
            }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-[#738094] font-mono">
          <span>0 (Low)</span>
          <span>50 (Moderate)</span>
          <span>100 (Severe)</span>
        </div>
      </div>

      {/* Summary Narrative */}
      <div className="p-4 rounded-xl bg-[#161B23] border border-white/5 space-y-1.5">
        <div className="text-xs font-semibold uppercase tracking-wider text-[#738094]">
          Executive Summary
        </div>
        <p className="text-sm sm:text-base text-[#F5F7FA] leading-relaxed">
          {summary}
        </p>
      </div>

      {/* Required Legal Disclaimer Note */}
      <div className="flex items-start gap-2.5 pt-1 text-xs text-[#738094]">
        <svg
          className="w-4 h-4 text-[#738094] shrink-0 mt-0.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        <span>
          AI-generated review indicator—not a legal verdict. Always consult a qualified attorney for binding legal matters.
        </span>
      </div>
    </section>
  );
}
