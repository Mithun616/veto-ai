"use client";

import React, { useRef, useCallback } from "react";
import { Header } from "./components/Header";
import { Hero } from "./components/Hero";
import { HowItWorks } from "./components/HowItWorks";
import { DocumentWorkspace } from "./components/DocumentWorkspace";
import { AnalysisLoading } from "./components/AnalysisLoading";
import { RiskOverview } from "./components/RiskOverview";
import { ClauseOverview } from "./components/ClauseOverview";
import { ClauseCard } from "./components/ClauseCard";
import { MissingProtectionCard } from "./components/MissingProtectionCard";
import { NegotiationEmailCard } from "./components/NegotiationEmailCard";
import { SavedScansDrawer } from "./components/SavedScansDrawer";
import { Footer } from "./components/Footer";
import { useVetoSession } from "@/hooks/useVetoSession";

export default function HomePage() {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Focus and scroll to workspace
  const handleScrollToWorkspace = useCallback(() => {
    const el = document.getElementById("document-workspace");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 350);
    }
  }, []);

  const {
    activeTab,
    setActiveTab,
    documentText,
    selectedFile,
    loading,
    error,
    result,
    isStale,
    activeFilter,
    setActiveFilter,
    userToggledIds,
    user,
    savedScans,
    isHistoryOpen,
    setIsHistoryOpen,
    sortedClauses,
    defaultExpandedId,
    filteredClauses,
    toggleClause,
    handleLoadSample,
    handleTextChange,
    handleFileSelect,
    handleFileRemove,
    handleClear,
    handleSubmit,
    handleSignIn,
    handleSignOut,
    handleSelectScan,
  } = useVetoSession({
    onScrollToWorkspace: handleScrollToWorkspace,
  });

  return (
    <div className="min-h-screen bg-[#07090D] text-[#F5F7FA] bg-grid-subtle flex flex-col justify-between">
      <div>
        {/* Semantic Header with Auth & History Controls */}
        <Header
          user={user}
          historyCount={savedScans.length}
          onSignIn={handleSignIn}
          onSignOut={handleSignOut}
          onToggleHistory={() => setIsHistoryOpen(true)}
        />

        {/* Collapsible Saved Scans Drawer */}
        <SavedScansDrawer
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
          scans={savedScans}
          onSelectScan={handleSelectScan}
        />

        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 pb-16">
          {/* Hero Section */}
          <Hero
            onReviewClick={handleScrollToWorkspace}
            onTrySampleClick={() => handleLoadSample("internship")}
          />

          {/* Document Workspace */}
          <div>
            <DocumentWorkspace
              activeTab={activeTab}
              onTabChange={setActiveTab}
              documentText={documentText}
              onTextChange={handleTextChange}
              selectedFile={selectedFile}
              onFileSelect={handleFileSelect}
              onFileRemove={handleFileRemove}
              onLoadSample={handleLoadSample}
              onClear={handleClear}
              onSubmit={handleSubmit}
              loading={loading}
              error={error}
              isStale={isStale}
              textareaRef={textareaRef}
              user={user}
            />
          </div>

          {/* Loading Indicator */}
          {loading && <AnalysisLoading />}

          {/* Results Dashboard */}
          {result && (
            <div
              className="space-y-10 pt-4 animate-fade-in"
              id="results-section"
              role="region"
              aria-live="polite"
              aria-label="Document audit results"
            >
              {/* Stale warning if document was changed after analysis */}
              {isStale && (
                <div
                  role="alert"
                  className="p-4 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/25 flex items-center justify-between gap-4 text-xs sm:text-sm text-[#F59E0B]"
                >
                  <div className="flex items-center gap-2.5">
                    <svg
                      className="w-4 h-4 shrink-0"
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
                    <span>
                      <strong>Outdated findings:</strong> The text above has changed since this review was generated.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    aria-label="Re-analyze modified document text"
                    className="px-3 py-1.5 rounded-lg bg-[#F59E0B] text-[#07090D] font-semibold text-xs hover:bg-[#e08f0a] transition-colors shrink-0"
                  >
                    Refresh Review
                  </button>
                </div>
              )}

              {/* Section A: Overview */}
              <RiskOverview result={result} />

              {/* Section B: Document Risk Overview & Flagged Clauses */}
              <section className="space-y-6">
                <ClauseOverview
                  clauses={result.flaggedClauses || []}
                  activeFilter={activeFilter}
                  onFilterChange={setActiveFilter}
                />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold text-[#F5F7FA]">
                        Flagged Clauses
                      </h2>
                      <p className="text-xs sm:text-sm text-[#ABB5C5]">
                        Sorted by severity: High concerns first, followed by Medium and Low.
                      </p>
                    </div>
                    <span className="text-xs font-mono px-3 py-1 rounded-full bg-[#161B23] border border-white/10 text-[#ABB5C5]">
                      Showing {filteredClauses.length} of {sortedClauses.length}
                    </span>
                  </div>

                  {filteredClauses.length > 0 ? (
                    <div className="space-y-3">
                      {filteredClauses.map((item) => (
                        <ClauseCard
                          key={item.id}
                          id={item.id}
                          clause={item.clause}
                          index={item.originalIndex}
                          isExpanded={
                            userToggledIds[item.id] !== undefined
                              ? userToggledIds[item.id]
                              : item.id === defaultExpandedId
                          }
                          onToggle={() => toggleClause(item.id)}
                        />
                      ))}
                    </div>
                  ) : sortedClauses.length > 0 ? (
                    <div className="p-8 rounded-2xl bg-[#101319] border border-white/[0.08] text-center space-y-3">
                      <p className="text-sm font-medium text-[#F5F7FA]">
                        No {activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1)} concern clauses found.
                      </p>
                      <button
                        type="button"
                        onClick={() => setActiveFilter("all")}
                        className="px-4 py-2 rounded-xl bg-[#161B23] hover:bg-[#1f2633] text-xs font-medium text-[#6CA8FF] hover:text-white border border-white/10 transition-colors"
                      >
                        Show all flagged clauses ({sortedClauses.length})
                      </button>
                    </div>
                  ) : null}
                </div>
              </section>

              {/* Section C: Missing Protections */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-[#F5F7FA]">
                      Protections not found in this text
                    </h2>
                    <p className="text-xs sm:text-sm text-[#ABB5C5]">
                      These may appear elsewhere in the full agreement.
                    </p>
                  </div>
                  <span className="text-xs font-mono px-3 py-1 rounded-full bg-[#F59E0B]/10 border border-[#F59E0B]/20 text-[#F59E0B]">
                    {result.missingProtections?.length ?? 0} missing
                  </span>
                </div>

                {result.missingProtections && result.missingProtections.length > 0 ? (
                  <div className="space-y-3">
                    {result.missingProtections.map((protection, idx) => (
                      <MissingProtectionCard
                        key={protection.id || `protection-${idx + 1}`}
                        id={protection.id || `protection-${idx + 1}`}
                        protection={protection}
                        index={idx}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="p-6 rounded-2xl bg-[#101319] border border-white/10 text-center text-xs text-[#ABB5C5]">
                    No standard protections were flagged as missing in this text excerpt.
                  </div>
                )}
              </section>

              {/* Section D: Negotiation Email */}
              {result.negotiationEmail && (
                <NegotiationEmailCard
                  email={result.negotiationEmail}
                  userName={user?.displayName}
                  isStale={isStale}
                />
              )}

              {/* Section E: Review Another Document CTA */}
              <div className="pt-6 pb-2 text-center">
                <button
                  type="button"
                  onClick={handleScrollToWorkspace}
                  aria-label="Scroll to workspace to review another document"
                  className="px-6 py-3 rounded-xl bg-[#161B23] hover:bg-[#1f2633] text-[#F5F7FA] font-medium text-sm border border-white/10 transition-colors inline-flex items-center gap-2 min-h-[44px]"
                >
                  <svg
                    className="w-4 h-4 text-[#6CA8FF]"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <line x1="12" y1="19" x2="12" y2="5" />
                    <polyline points="5 12 12 5 19 12" />
                  </svg>
                  <span>Review another document</span>
                </button>
              </div>
            </div>
          )}

          {/* How It Works Educational Section */}
          <HowItWorks />
        </main>
      </div>

      {/* Semantic Footer */}
      <Footer />
    </div>
  );
}
