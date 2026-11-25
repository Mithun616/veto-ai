"use client";

import React, { useEffect, useState } from "react";
import { FlaggedClause } from "./types";
import {
  NormalizedSeverity,
  getNormalizedSeverity,
  getSeverityRank,
} from "@/lib/veto";

export type { NormalizedSeverity };
export { getNormalizedSeverity, getSeverityRank };
export type SeverityFilter = "all" | "high" | "medium" | "low" | "unrated";

interface ClauseOverviewProps {
  clauses: FlaggedClause[];
  activeFilter: SeverityFilter;
  onFilterChange: (filter: SeverityFilter) => void;
}

export function ClauseOverview({
  clauses,
  activeFilter,
  onFilterChange,
}: ClauseOverviewProps) {
  const [animated, setAnimated] = useState(false);

  // Trigger one-time animation on mount / results arrival
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimated(true);
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  const total = clauses.length;

  const highCount = clauses.filter(
    (c) => getNormalizedSeverity(c.risk) === "High"
  ).length;
  const mediumCount = clauses.filter(
    (c) => getNormalizedSeverity(c.risk) === "Medium"
  ).length;
  const lowCount = clauses.filter(
    (c) => getNormalizedSeverity(c.risk) === "Low"
  ).length;
  const unratedCount = clauses.filter(
    (c) => getNormalizedSeverity(c.risk) === "Unrated"
  ).length;

  // Empty state handling
  if (total === 0) {
    return (
      <div className="p-6 rounded-2xl bg-[#101319] border border-white/[0.08] text-center space-y-2">
        <p className="text-sm font-medium text-[#F5F7FA]">
          No concerning clauses were identified in the supplied text.
        </p>
        <p className="text-xs text-[#738094]">
          This does not guarantee the agreement is risk-free.
        </p>
      </div>
    );
  }

  // Calculate proportional widths
  const highPct = total > 0 ? (highCount / total) * 100 : 0;
  const medPct = total > 0 ? (mediumCount / total) * 100 : 0;
  const lowPct = total > 0 ? (lowCount / total) * 100 : 0;
  const unratedPct = total > 0 ? (unratedCount / total) * 100 : 0;

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-[#101319] border border-white/[0.08] space-y-5">
      {/* Top row: Summary heading & total count */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-base sm:text-lg font-semibold text-[#F5F7FA]">
            Document Risk Overview
          </h3>
          <p className="text-xs text-[#ABB5C5]">
            {total} flagged {total === 1 ? "clause" : "clauses"} identified across risk tiers.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-[#ABB5C5] bg-[#161B23] px-3 py-1 rounded-full border border-white/5">
            Total: {total}
          </span>
        </div>
      </div>

      {/* Segmented Horizontal Distribution Bar */}
      <div className="space-y-2">
        <div
          role="img"
          aria-label={`Distribution bar: ${highCount} High concerns (${Math.round(
            highPct
          )}%), ${mediumCount} Medium concerns (${Math.round(
            medPct
          )}%), ${lowCount} Low concerns (${Math.round(lowPct)}%)`}
          className="w-full h-3 rounded-full bg-[#07090D] border border-white/10 overflow-hidden flex"
        >
          {highCount > 0 && (
            <div
              style={{
                width: animated ? `${highPct}%` : "0%",
              }}
              className="h-full bg-red-500 transition-all duration-700 ease-out"
              title={`High concern: ${highCount} (${Math.round(highPct)}%)`}
            />
          )}
          {mediumCount > 0 && (
            <div
              style={{
                width: animated ? `${medPct}%` : "0%",
              }}
              className="h-full bg-amber-500 transition-all duration-700 ease-out"
              title={`Medium concern: ${mediumCount} (${Math.round(medPct)}%)`}
            />
          )}
          {lowCount > 0 && (
            <div
              style={{
                width: animated ? `${lowPct}%` : "0%",
              }}
              className="h-full bg-blue-500 transition-all duration-700 ease-out"
              title={`Low concern: ${lowCount} (${Math.round(lowPct)}%)`}
            />
          )}
          {unratedCount > 0 && (
            <div
              style={{
                width: animated ? `${unratedPct}%` : "0%",
              }}
              className="h-full bg-zinc-500 transition-all duration-700 ease-out"
              title={`Unrated concern: ${unratedCount} (${Math.round(
                unratedPct
              )}%)`}
            />
          )}
        </div>

        {/* Explanatory Caption */}
        <p className="text-[11px] text-[#738094] italic">
          Distribution of flagged clauses—not probability of harm.
        </p>
      </div>

      {/* Text Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" aria-hidden="true" />
          <span className="text-[#F5F7FA] font-medium">High concern:</span>
          <span className="text-[#ABB5C5] font-mono">{highCount}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" aria-hidden="true" />
          <span className="text-[#F5F7FA] font-medium">Medium concern:</span>
          <span className="text-[#ABB5C5] font-mono">{mediumCount}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" aria-hidden="true" />
          <span className="text-[#F5F7FA] font-medium">Low concern:</span>
          <span className="text-[#ABB5C5] font-mono">{lowCount}</span>
        </div>

        {unratedCount > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-zinc-500 shrink-0" aria-hidden="true" />
            <span className="text-[#F5F7FA] font-medium">Unrated:</span>
            <span className="text-[#ABB5C5] font-mono">{unratedCount}</span>
          </div>
        )}
      </div>

      {/* Interactive Filter Buttons */}
      <div
        role="group"
        aria-label="Filter clauses by severity"
        className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/[0.06]"
      >
        <span className="text-xs text-[#738094] mr-1 hidden sm:inline">
          Filter view:
        </span>

        <button
          type="button"
          onClick={() => onFilterChange("all")}
          aria-pressed={activeFilter === "all"}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors min-h-[38px] flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6CA8FF] ${
            activeFilter === "all"
              ? "bg-[#161B23] text-[#F5F7FA] border border-white/20 shadow-sm"
              : "bg-[#07090D] text-[#ABB5C5] hover:text-[#F5F7FA] border border-white/5"
          }`}
        >
          <span>All</span>
          <span className="font-mono text-[11px] opacity-75">({total})</span>
        </button>

        <button
          type="button"
          onClick={() => onFilterChange("high")}
          aria-pressed={activeFilter === "high"}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors min-h-[38px] flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 ${
            activeFilter === "high"
              ? "bg-red-500/20 text-red-300 border border-red-500/40 shadow-sm"
              : "bg-[#07090D] text-[#ABB5C5] hover:text-red-300 border border-white/5"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-red-500" aria-hidden="true" />
          <span>High</span>
          <span className="font-mono text-[11px] opacity-75">({highCount})</span>
        </button>

        <button
          type="button"
          onClick={() => onFilterChange("medium")}
          aria-pressed={activeFilter === "medium"}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors min-h-[38px] flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
            activeFilter === "medium"
              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
              : "bg-[#07090D] text-[#ABB5C5] hover:text-amber-300 border border-white/5"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-amber-500" aria-hidden="true" />
          <span>Medium</span>
          <span className="font-mono text-[11px] opacity-75">({mediumCount})</span>
        </button>

        <button
          type="button"
          onClick={() => onFilterChange("low")}
          aria-pressed={activeFilter === "low"}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors min-h-[38px] flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
            activeFilter === "low"
              ? "bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-sm"
              : "bg-[#07090D] text-[#ABB5C5] hover:text-blue-300 border border-white/5"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-blue-500" aria-hidden="true" />
          <span>Low</span>
          <span className="font-mono text-[11px] opacity-75">({lowCount})</span>
        </button>

        {unratedCount > 0 && (
          <button
            type="button"
            onClick={() => onFilterChange("unrated")}
            aria-pressed={activeFilter === "unrated"}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors min-h-[38px] flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ${
              activeFilter === "unrated"
                ? "bg-zinc-500/20 text-zinc-300 border border-zinc-500/40 shadow-sm"
                : "bg-[#07090D] text-[#ABB5C5] hover:text-zinc-300 border border-white/5"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-zinc-500" aria-hidden="true" />
            <span>Unrated</span>
            <span className="font-mono text-[11px] opacity-75">({unratedCount})</span>
          </button>
        )}
      </div>
    </div>
  );
}
