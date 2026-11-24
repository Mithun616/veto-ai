"use client";

import React, { useState, useRef } from "react";

interface FlaggedClause {
  title: string;
  quote: string;
  risk: "Low" | "Medium" | "High";
  whyItMatters: string;
  negotiationLine: string;
}

interface MissingProtection {
  title: string;
  whyItMatters: string;
  askFor: string;
}

interface NegotiationEmail {
  subject: string;
  body: string;
}

interface AnalysisResult {
  overallRisk: "Low" | "Medium" | "High";
  riskScore: number;
  summary: string;
  flaggedClauses: FlaggedClause[];
  missingProtections: MissingProtection[];
  negotiationEmail: NegotiationEmail;
}

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
  const [documentText, setDocumentText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [copied, setCopied] = useState(false);
  const resultsRef = useRef<HTMLDivElement | null>(null);

  const characterCount = documentText.length;
  const isTooShort = characterCount < 50;

  const handleAnalyze = async () => {
    if (isTooShort || loading) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentText }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to analyze document.");
      }

      setResult(data as AnalysisResult);
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Unable to analyze document at this time. Please check your network and Gemini API key.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyEmail = async () => {
    if (!result?.negotiationEmail) return;
    const textToCopy = `Subject: ${result.negotiationEmail.subject}\n\n${result.negotiationEmail.body}`;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getRiskColor = (score: number, riskLevel?: string) => {
    if (score >= 70 || riskLevel === "High") {
      return {
        badgeBg: "bg-rose-50 border-rose-200 text-rose-700",
        stroke: "stroke-rose-500",
        text: "text-rose-600",
        border: "border-l-rose-500",
        dot: "bg-rose-500",
        label: "High Risk",
      };
    }
    if (score >= 35 || riskLevel === "Medium") {
      return {
        badgeBg: "bg-amber-50 border-amber-200 text-amber-700",
        stroke: "stroke-amber-500",
        text: "text-amber-600",
        border: "border-l-amber-500",
        dot: "bg-amber-500",
        label: "Medium Risk",
      };
    }
    return {
      badgeBg: "bg-emerald-50 border-emerald-200 text-emerald-700",
      stroke: "stroke-emerald-500",
      text: "text-emerald-600",
      border: "border-l-emerald-500",
      dot: "bg-emerald-500",
      label: "Low Risk",
    };
  };

  const riskColorMeta = result
    ? getRiskColor(result.riskScore, result.overallRisk)
    : getRiskColor(50);

  // SVG Gauge calculations
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = result
    ? circumference - (circumference * result.riskScore) / 100
    : circumference;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-500/20 text-white">
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight text-slate-900">
                Veto<span className="text-indigo-600">AI</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Educational Risk Review • Not Legal Advice
            </span>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-12 pb-8 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold mb-4">
          <svg
            className="w-3.5 h-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
          Powered by Gemini 2.5 Flash
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-950 tracking-tight leading-tight">
          Know the traps before you sign.
        </h1>
        <p className="mt-3 text-lg sm:text-xl font-medium text-indigo-600 tracking-tight">
          Push back before you sign.
        </p>
        <p className="mt-2 text-sm sm:text-base text-slate-600 max-w-2xl mx-auto">
          Students, interns, and tenants get trapped by predatory training bonds,
          unreasonable deposit forfeitures, and broad IP grabs. VetoAI flags the
          danger and writes your negotiation script.
        </p>

        {/* Use-Case Pills */}
        <div className="mt-6 flex flex-wrap justify-center gap-2.5">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-slate-200 shadow-2xs text-xs font-medium text-slate-700">
            <span className="text-indigo-500">💼</span>
            <span>Internship Offers</span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-slate-200 shadow-2xs text-xs font-medium text-slate-700">
            <span className="text-amber-500">🏠</span>
            <span>Rental Agreements</span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-slate-200 shadow-2xs text-xs font-medium text-slate-700">
            <span className="text-violet-500">📄</span>
            <span>SaaS Terms</span>
          </div>
        </div>
      </section>

      {/* Main Input Card */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xl shadow-slate-200/50 p-5 sm:p-7">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
            <div>
              <label
                htmlFor="document-textarea"
                className="text-sm font-semibold text-slate-900 flex items-center gap-2"
              >
                <span>Paste Contract, Offer Letter, or Agreement</span>
                <span className="text-xs font-normal text-slate-500">
                  (min. 50 characters)
                </span>
              </label>
            </div>

            {/* Quick Sample Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                Load sample:
              </span>
              <button
                type="button"
                onClick={() => setDocumentText(SAMPLE_INTERNSHIP)}
                className="text-xs font-medium px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors border border-indigo-200/60 flex items-center gap-1 cursor-pointer"
              >
                <span>💼</span>
                <span>Try sample internship offer</span>
              </button>
              <button
                type="button"
                onClick={() => setDocumentText(SAMPLE_RENTAL)}
                className="text-xs font-medium px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 hover:bg-amber-100 transition-colors border border-amber-200/60 flex items-center gap-1 cursor-pointer"
              >
                <span>🏠</span>
                <span>Try sample rental agreement</span>
              </button>
            </div>
          </div>

          <div className="relative">
            <textarea
              id="document-textarea"
              rows={8}
              value={documentText}
              onChange={(e) => setDocumentText(e.target.value)}
              placeholder="Paste your contract, offer letter, lease agreement, or freelance terms here... VetoAI will review for training bonds, harsh penalties, unreasonable notice periods, and missing clauses."
              className="w-full p-4 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition text-sm text-slate-800 placeholder-slate-400 bg-slate-50/50 resize-y font-mono"
            />
          </div>

          <div className="mt-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2 text-xs">
              <span
                className={`font-medium ${
                  isTooShort ? "text-slate-500" : "text-emerald-600"
                }`}
              >
                {characterCount.toLocaleString()} characters
              </span>
              {isTooShort && (
                <span className="text-slate-500">
                  ({50 - characterCount} more needed)
                </span>
              )}
              {documentText.length > 0 && (
                <button
                  type="button"
                  onClick={() => setDocumentText("")}
                  className="ml-2 text-slate-500 hover:text-slate-700 underline underline-offset-2 cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            <button
              type="button"
              disabled={isTooShort || loading}
              onClick={handleAnalyze}
              className={`inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm shadow-md transition-all cursor-pointer ${
                isTooShort || loading
                  ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                  : "bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-indigo-500/25 hover:shadow-indigo-500/35 active:scale-98"
              }`}
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Analyzing Document with Gemini...
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.3-4.3" />
                  </svg>
                  Analyze Document
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mt-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3">
            <svg
              className="w-5 h-5 text-rose-600 shrink-0 mt-0.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div className="flex-1 text-sm">
              <h4 className="font-semibold text-rose-900">
                Analysis Couldn&apos;t Complete
              </h4>
              <p className="mt-1 text-rose-700">{error}</p>
              <p className="mt-2 text-xs text-rose-600">
                Tip: Make sure your <code>GEMINI_API_KEY</code> is correctly configured in your <code>.env</code> file.
              </p>
            </div>
          </div>
        )}

        {/* Loading Skeletons */}
        {loading && (
          <div className="mt-10 space-y-6 animate-pulse">
            {/* Summary Banner Skeleton */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col md:flex-row items-center gap-6">
              <div className="w-28 h-28 rounded-full bg-slate-200 shrink-0" />
              <div className="flex-1 w-full space-y-3">
                <div className="w-32 h-6 bg-slate-200 rounded-full" />
                <div className="w-full h-4 bg-slate-200 rounded" />
                <div className="w-3/4 h-4 bg-slate-200 rounded" />
              </div>
            </div>

            {/* Columns Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-7 space-y-4">
                <div className="w-48 h-6 bg-slate-200 rounded" />
                <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
                  <div className="w-1/3 h-5 bg-slate-200 rounded" />
                  <div className="w-full h-12 bg-slate-100 rounded" />
                  <div className="w-5/6 h-4 bg-slate-200 rounded" />
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
                  <div className="w-1/3 h-5 bg-slate-200 rounded" />
                  <div className="w-full h-12 bg-slate-100 rounded" />
                  <div className="w-5/6 h-4 bg-slate-200 rounded" />
                </div>
              </div>
              <div className="lg:col-span-5">
                <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
                  <div className="w-40 h-6 bg-slate-200 rounded" />
                  <div className="w-full h-8 bg-slate-100 rounded" />
                  <div className="w-full h-40 bg-slate-100 rounded" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Results Dashboard */}
        {result && !loading && (
          <div ref={resultsRef} className="mt-12 space-y-8">
            {/* Top Summary Banner with Circular Risk Gauge */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-lg p-6 sm:p-8">
              <div className="flex flex-col md:flex-row items-center gap-8">
                {/* Animated Circular SVG Risk Score Gauge */}
                <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 110 110">
                    <circle
                      cx="55"
                      cy="55"
                      r={radius}
                      strokeWidth="10"
                      className="stroke-slate-100 fill-none"
                    />
                    <circle
                      cx="55"
                      cy="55"
                      r={radius}
                      strokeWidth="10"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      className={`${riskColorMeta.stroke} fill-none transition-all duration-1000 ease-out`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className={`text-3xl font-extrabold tracking-tight ${riskColorMeta.text}`}>
                      {result.riskScore}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      / 100 Risk
                    </span>
                  </div>
                </div>

                {/* Summary & Overall Badge */}
                <div className="flex-1 text-center md:text-left">
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 mb-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wide ${riskColorMeta.badgeBg}`}
                    >
                      <span className={`w-2 h-2 rounded-full ${riskColorMeta.dot}`}></span>
                      {result.overallRisk} Risk Document
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      {result.flaggedClauses.length} Flagged Clauses • {result.missingProtections.length} Missing Protections
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-slate-900 mt-1">
                    Risk Assessment Overview
                  </h3>
                  <p className="mt-2 text-sm sm:text-base text-slate-600 leading-relaxed">
                    {result.summary}
                  </p>
                </div>
              </div>
            </div>

            {/* 2-Column Desktop Layout (Stacked on Mobile) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: Flagged Clauses & Missing Protections */}
              <div className="lg:col-span-7 space-y-8">
                {/* Flagged Clauses Section */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <span className="text-rose-500">⚠️</span>
                      Flagged Clauses ({result.flaggedClauses.length})
                    </h3>
                    <span className="text-xs text-slate-500">
                      Clauses that require scrutiny
                    </span>
                  </div>

                  {result.flaggedClauses.length === 0 ? (
                    <div className="p-5 rounded-xl bg-white border border-slate-200 text-sm text-slate-500 text-center">
                      No high-risk clauses were flagged in this excerpt.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {result.flaggedClauses.map((clause, index) => {
                        const clauseRiskMeta = getRiskColor(
                          clause.risk === "High" ? 85 : clause.risk === "Medium" ? 50 : 20,
                          clause.risk
                        );
                        return (
                          <div
                            key={index}
                            className={`bg-white rounded-xl border border-slate-200 shadow-2xs p-5 transition-all hover:shadow-md ${clauseRiskMeta.border} border-l-4`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <h4 className="font-semibold text-slate-900 text-sm sm:text-base">
                                {clause.title}
                              </h4>
                              <span
                                className={`shrink-0 text-[11px] font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${clauseRiskMeta.badgeBg}`}
                              >
                                {clause.risk}
                              </span>
                            </div>

                            {/* Quote snippet */}
                            {clause.quote && (
                              <div className="mt-3 p-3 rounded-lg bg-slate-50 border border-slate-200/70 text-xs sm:text-sm italic text-slate-700 relative">
                                <span className="font-serif text-slate-400 mr-1 text-base leading-none">“</span>
                                {clause.quote}
                                <span className="font-serif text-slate-400 ml-1 text-base leading-none">”</span>
                              </div>
                            )}

                            {/* Why it matters */}
                            <div className="mt-3">
                              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                                Why it matters:
                              </span>
                              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                                {clause.whyItMatters}
                              </p>
                            </div>

                            {/* How to push back */}
                            <div className="mt-3.5 pt-3 border-t border-slate-100 bg-indigo-50/50 -mx-5 -mb-5 p-4 rounded-b-xl">
                              <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                                <svg
                                  className="w-3.5 h-3.5 text-indigo-600"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.5"
                                >
                                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                </svg>
                                How to push back:
                              </span>
                              <p className="text-xs sm:text-sm font-medium text-indigo-950">
                                &ldquo;{clause.negotiationLine}&rdquo;
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Missing Protections Section */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <span className="text-amber-500">🛡️</span>
                      Missing Protections ({result.missingProtections.length})
                    </h3>
                    <span className="text-xs text-slate-500">
                      Standard terms omitted from the text
                    </span>
                  </div>

                  {result.missingProtections.length === 0 ? (
                    <div className="p-5 rounded-xl bg-white border border-slate-200 text-sm text-slate-500 text-center">
                      No standard protective clauses are conspicuously missing.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {result.missingProtections.map((protection, index) => (
                        <div
                          key={index}
                          className="bg-white rounded-xl border border-slate-200 border-l-4 border-l-amber-400 shadow-2xs p-5 transition-all hover:shadow-md"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-semibold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                              <svg
                                className="w-4 h-4 text-amber-500 shrink-0"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="8" x2="12" y2="12" />
                                <line x1="12" y1="16" x2="12.01" y2="16" />
                              </svg>
                              {protection.title}
                            </h4>
                            <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 uppercase tracking-wider">
                              Missing
                            </span>
                          </div>

                          <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                            {protection.whyItMatters}
                          </p>

                          <div className="mt-3 p-3 rounded-lg bg-amber-50/70 border border-amber-200/60 text-xs sm:text-sm">
                            <span className="font-bold text-amber-900 block mb-0.5">
                              Ask to add:
                            </span>
                            <span className="text-amber-950 font-medium">
                              &ldquo;{protection.askFor}&rdquo;
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Sticky Ready-to-Send Negotiation Email */}
              <div className="lg:col-span-5 lg:sticky lg:top-20 space-y-4">
                <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xl p-6 sm:p-7">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                    <div>
                      <h3 className="font-bold text-slate-900 text-base sm:text-lg flex items-center gap-2">
                        <span className="text-indigo-600">✉️</span>
                        Negotiation Email
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Diplomatic counter-proposal drafted by AI
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleCopyEmail}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer ${
                        copied
                          ? "bg-emerald-600 text-white shadow-emerald-500/20"
                          : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20"
                      }`}
                    >
                      {copied ? (
                        <>
                          <svg
                            className="w-3.5 h-3.5"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          Copied!
                        </>
                      ) : (
                        <>
                          <svg
                            className="w-3.5 h-3.5"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                          </svg>
                          Copy Email
                        </>
                      )}
                    </button>
                  </div>

                  {/* Subject */}
                  <div className="mt-4">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Subject
                    </span>
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 break-words">
                      {result.negotiationEmail.subject}
                    </div>
                  </div>

                  {/* Body */}
                  <div className="mt-4">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Email Body
                    </span>
                    <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200 text-xs sm:text-sm text-slate-700 whitespace-pre-wrap leading-relaxed max-h-[460px] overflow-y-auto font-sans">
                      {result.negotiationEmail.body}
                    </div>
                  </div>

                  {/* Bottom Tip */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span>💡 Pro-tip: Personalize before sending</span>
                    <button
                      type="button"
                      onClick={handleCopyEmail}
                      className="text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                    >
                      {copied ? "Copied to clipboard" : "Click to copy"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
