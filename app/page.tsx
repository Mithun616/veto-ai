"use client";

import React, { useState, useRef } from "react";
import { Header } from "./components/Header";
import { Hero } from "./components/Hero";
import { HowItWorks } from "./components/HowItWorks";
import { DocumentWorkspace } from "./components/DocumentWorkspace";
import { AnalysisLoading } from "./components/AnalysisLoading";
import { RiskOverview } from "./components/RiskOverview";
import { ClauseCard } from "./components/ClauseCard";
import { MissingProtectionCard } from "./components/MissingProtectionCard";
import { NegotiationEmailCard } from "./components/NegotiationEmailCard";
import { Footer } from "./components/Footer";
import { AnalysisResult, InputTab } from "./components/types";

const SAMPLE_INTERNSHIP = `INTERNSHIP & TRAINING OFFER LETTER - APEX CLOUD TECH PVT. LTD. (BANGALORE)

Dear Candidate,
We are pleased to offer you the position of Software Engineering Intern for a period of 6 months, commencing from July 1st.

Key Terms & Conditions:
1. Training Bond & Liquidated Damages: The intern agrees to undergo mandatory proprietary software training valued at INR 1,50,000. In the event the intern leaves the internship prior to completing the full 6 months plus a mandatory 18-month full-time commitment post-internship, the intern shall immediately reimburse the company INR 2,00,000 as liquidated damages and training expenses.
2. Stipend & Mandatory Withholding: A monthly stipend of INR 12,000 will be paid. However, 50% of the monthly stipend (INR 6,000) will be retained by the company as a 'Security Deposit' and will only be disbursed upon successful completion of the full 24-month tenure.
3. Notice Period & Unilateral Termination: The intern must provide 90 days written notice prior to resignation, subject to explicit written approval from management. The company reserves the right to terminate the internship immediately without prior notice, explanation, or severance.
4. Intellectual Property & Personal Side Projects: The intern hereby irrevocably assigns to the Company all rights, title, and interest in all intellectual property, software, designs, algorithms, and ideas developed during the internship term, including any personal side projects, open-source contributions, or applications created on weekends, off-duty hours, or using personal equipment.
5. Non-Compete: For 24 months following separation, the intern shall not work for, consult, or start any business in software development or cloud computing anywhere in India.`;

const SAMPLE_RENTAL = `RESIDENTIAL TENANCY AGREEMENT (BENGALURU / HYDERABAD)

This Agreement is made on 1st November between Mr. R. K. Sharma (Lessor/Landlord) and the Tenant for Flat 402, Greenview Heights.

Terms & Conditions:
1. Security Deposit & Non-Refundable Deductions: The Tenant shall deposit an interest-free refundable security deposit of INR 1,50,000 (equivalent to 10 months rent). Upon vacating the premises, a mandatory non-negotiable deduction of 1 full month's rent (INR 25,000) shall be deducted for painting and deep cleaning, irrespective of the tenancy duration or the physical condition of the walls.
2. Deposit Refund Timeline: The remaining security deposit shall be refunded at the Landlord's sole convenience within 90 to 120 days following full physical vacancy and handover of keys.
3. Landlord Entry & Inspection: The Landlord or his designated agents reserve the unconditional right to enter and inspect the premises at any time of the day or night without prior notice or permission from the Tenant.
4. Maintenance & Structural Repairs: The Tenant is exclusively responsible for all repairs, water seepage fixes, electrical wiring issues, plumbing maintenance, and structural upkeep. The Landlord undertakes zero repair obligations.
5. Eviction & Termination: The Landlord reserves the right to terminate this tenancy with 7 days verbal notice without assigning any reason. If the Tenant terminates before 11 months, the entire security deposit of INR 1,50,000 will be completely forfeited.`;

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<InputTab>("paste");
  const [documentText, setDocumentText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isStale, setIsStale] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const resultsRef = useRef<HTMLDivElement | null>(null);
  const workspaceRef = useRef<HTMLDivElement | null>(null);

  // Focus and scroll to workspace
  const handleScrollToWorkspace = () => {
    const el = document.getElementById("document-workspace");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 350);
    }
  };

  // Try a sample (populates text, switches tab, does NOT auto-submit)
  const handleLoadSample = (type: "internship" | "rental") => {
    const sampleText = type === "internship" ? SAMPLE_INTERNSHIP : SAMPLE_RENTAL;
    setActiveTab("paste");
    setDocumentText(sampleText);
    setSelectedFile(null);
    setError(null);
    setIsStale(false);

    handleScrollToWorkspace();
  };

  // Text change handler with stale tracking
  const handleTextChange = (text: string) => {
    setDocumentText(text);
    if (result) {
      setIsStale(true);
    }
    if (error) setError(null);
  };

  // File select handler with validation & stale tracking
  const handleFileSelect = (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "pdf" && ext !== "docx" && ext !== "txt") {
      setError("Please select a .pdf, .docx, or .txt file.");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setError(
        `File size (${(file.size / (1024 * 1024)).toFixed(
          1
        )} MB) exceeds the 4 MB limit.`
      );
      return;
    }

    setSelectedFile(file);
    setError(null);
    if (result) {
      setIsStale(true);
    }
  };

  const handleFileRemove = () => {
    setSelectedFile(null);
    if (result) {
      setIsStale(true);
    }
  };

  const handleClear = () => {
    setDocumentText("");
    setSelectedFile(null);
    setError(null);
    setIsStale(false);
  };

  // Submit for analysis
  const handleSubmit = async () => {
    if (loading) return;

    if (activeTab === "paste" && documentText.trim().length < 20) {
      setError("Please enter at least 20 characters of document text.");
      return;
    }

    if (activeTab === "upload" && !selectedFile) {
      setError("Please select a document file (.pdf, .docx, or .txt).");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let response: Response;

      if (activeTab === "upload" && selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);
        response = await fetch("/api/analyze", {
          method: "POST",
          body: formData,
        });
      } else {
        response = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ documentText }),
        });
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Analysis failed. Please try again.");
      }

      setResult(data as AnalysisResult);
      setIsStale(false);

      // Smooth scroll to results
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Unable to complete analysis. Please try again in a few moments.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07090D] text-[#F5F7FA] bg-grid-subtle flex flex-col justify-between">
      <div>
        {/* Semantic Header */}
        <Header />

        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 pb-16">
          {/* Hero Section */}
          <Hero
            onReviewClick={handleScrollToWorkspace}
            onTrySampleClick={() => handleLoadSample("internship")}
          />

          {/* Document Workspace */}
          <div ref={workspaceRef}>
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
            />
          </div>

          {/* Loading Indicator */}
          {loading && <AnalysisLoading />}

          {/* Results Dashboard */}
          {result && (
            <div
              ref={resultsRef}
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

              {/* Section B: Flagged Clauses */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-[#F5F7FA]">
                      Flagged Clauses
                    </h2>
                    <p className="text-xs sm:text-sm text-[#ABB5C5]">
                      Potentially concerning terms that deviate from balanced standards.
                    </p>
                  </div>
                  <span className="text-xs font-mono px-3 py-1 rounded-full bg-[#161B23] border border-white/10 text-[#ABB5C5]">
                    {result.flaggedClauses?.length ?? 0} identified
                  </span>
                </div>

                {result.flaggedClauses && result.flaggedClauses.length > 0 ? (
                  <div className="space-y-4">
                    {result.flaggedClauses.map((clause, idx) => (
                      <ClauseCard key={idx} clause={clause} index={idx} />
                    ))}
                  </div>
                ) : (
                  <div className="p-6 rounded-2xl bg-[#101319] border border-white/10 text-center text-xs text-[#ABB5C5]">
                    No concerning clauses were flagged in the provided text.
                  </div>
                )}
              </section>

              {/* Section C: Missing Protections */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-[#F5F7FA]">
                      Protections not found in the supplied text
                    </h2>
                    <p className="text-xs sm:text-sm text-[#ABB5C5]">
                      These may appear elsewhere in the full agreement, but should be confirmed before signing.
                    </p>
                  </div>
                  <span className="text-xs font-mono px-3 py-1 rounded-full bg-[#F59E0B]/10 border border-[#F59E0B]/20 text-[#F59E0B]">
                    {result.missingProtections?.length ?? 0} missing
                  </span>
                </div>

                {result.missingProtections && result.missingProtections.length > 0 ? (
                  <div className="space-y-4">
                    {result.missingProtections.map((protection, idx) => (
                      <MissingProtectionCard
                        key={idx}
                        protection={protection}
                        index={idx}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="p-6 rounded-2xl bg-[#101319] border border-white/10 text-center text-xs text-[#ABB5C5]">
                    No critical missing protections were identified for this document type.
                  </div>
                )}
              </section>

              {/* Section D: Negotiation Email */}
              {result.negotiationEmail && (
                <NegotiationEmailCard email={result.negotiationEmail} />
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
