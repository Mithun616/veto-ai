"use client";

import React, { useState, useRef, useEffect } from "react";

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

const SCAN_STEPS = [
  "Reading document & extracting clauses...",
  "Flagging unfair training bonds & liabilities...",
  "Checking for missing consumer protections...",
  "Drafting diplomatic negotiation email...",
];

export default function HomePage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentText, setDocumentText] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [copied, setCopied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const resultsRef = useRef<HTMLDivElement | null>(null);

  const hasFile = selectedFile !== null;
  const characterCount = documentText.length;
  const canScan = hasFile || characterCount >= 50;

  // Stepper timer during loading
  useEffect(() => {
    if (!loading) return;

    const interval = setInterval(() => {
      setActiveStep((prev) => (prev < SCAN_STEPS.length - 1 ? prev + 1 : prev));
    }, 1600);

    return () => clearInterval(interval);
  }, [loading]);

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      validateAndSetFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      validateAndSetFile(file);
    }
  };

  const validateAndSetFile = (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "pdf" && ext !== "docx" && ext !== "txt") {
      setError("Please upload a .pdf, .docx, or .txt file.");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setError(`File is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Max limit is 4 MB.`);
      return;
    }
    setError(null);
    setSelectedFile(file);
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleScan = async () => {
    if (!canScan || loading) return;

    setLoading(true);
    setActiveStep(0);
    setError(null);
    setResult(null);

    try {
      let response: Response;

      if (selectedFile) {
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
        throw new Error(data.error || "Failed to analyze document.");
      }

      setResult(data as AnalysisResult);
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 150);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Unable to scan document. Please check your network and Gemini API configuration.";
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
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getRiskMeta = (score: number, riskLevel?: string) => {
    if (score >= 70 || riskLevel === "High") {
      return {
        badgeBg: "bg-rose-500/15 border-rose-500/30 text-rose-300",
        stroke: "stroke-rose-500",
        text: "text-rose-400",
        border: "border-l-rose-500",
        glow: "shadow-rose-950/40",
        dot: "bg-rose-500",
        label: "High Risk",
      };
    }
    if (score >= 35 || riskLevel === "Medium") {
      return {
        badgeBg: "bg-amber-500/15 border-amber-500/30 text-amber-300",
        stroke: "stroke-amber-400",
        text: "text-amber-400",
        border: "border-l-amber-400",
        glow: "shadow-amber-950/40",
        dot: "bg-amber-400",
        label: "Medium Risk",
      };
    }
    return {
      badgeBg: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300",
      stroke: "stroke-emerald-400",
      text: "text-emerald-400",
      border: "border-l-emerald-400",
      glow: "shadow-emerald-950/40",
      dot: "bg-emerald-400",
      label: "Low Risk",
    };
  };

  const riskMeta = result
    ? getRiskMeta(result.riskScore, result.overallRisk)
    : getRiskMeta(50);

  // SVG Gauge calculations
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = result
    ? circumference - (circumference * result.riskScore) / 100
    : circumference;

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      {/* Glow Backdrop */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[350px] bg-gradient-to-b from-cyan-600/10 via-indigo-600/5 to-transparent blur-3xl pointer-events-none -z-10" />

      {/* Top Bar */}
      <header className="sticky top-0 z-40 bg-[#0B0F19]/80 backdrop-blur-xl border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 via-blue-600 to-indigo-600 p-[1px] shadow-lg shadow-cyan-500/20">
              <div className="w-full h-full bg-[#0B0F19] rounded-[11px] flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-cyan-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
              </div>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-cyan-400 bg-clip-text text-transparent">
                VetoAI
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-500/30">
                X-Ray Scan
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-900/90 text-slate-300 border border-slate-700/80 shadow-inner">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-sm shadow-cyan-400"></span>
              Educational Risk Review • Not Legal Advice
            </span>
          </div>
        </div>
      </header>

      {/* Hero Headline */}
      <section className="pt-8 pb-4 text-center px-4">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white">
          Contract <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">X-Ray</span> Scanner
        </h1>
        <p className="mt-2 text-sm sm:text-base text-slate-400 max-w-xl mx-auto">
          Drop your PDF, DOCX, or paste any contract. VetoAI exposes predatory training bonds, deposit traps, and drafts your negotiation response.
        </p>
      </section>

      {/* Split Screen Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT PANEL: Document Input & File Upload */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-[#111827]/90 rounded-2xl border border-slate-800 shadow-2xl p-5 sm:p-6 backdrop-blur-md">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                  Document Input
                </span>
                <span className="text-[11px] text-slate-400">
                  PDF • DOCX • TXT (Max 4 MB)
                </span>
              </div>

              {/* Drag & Drop Upload Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-all ${
                  isDragging
                    ? "border-cyan-400 bg-cyan-950/20 shadow-lg shadow-cyan-500/10 scale-[1.01]"
                    : "border-slate-700 hover:border-slate-600 bg-slate-900/60 hover:bg-slate-900/90"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.txt"
                  className="hidden"
                  onChange={handleFileChange}
                />

                <div className="flex flex-col items-center justify-center gap-2">
                  <div className="w-12 h-12 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-cyan-400">
                    <svg
                      className="w-6 h-6"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-200">
                      Drag & drop your contract file
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      or <span className="text-cyan-400 underline">browse files</span> (.pdf, .docx, .txt)
                    </p>
                  </div>
                </div>
              </div>

              {/* Selected File Card */}
              {selectedFile && (
                <div className="mt-3 p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/40 flex items-center justify-between gap-3 animate-fadeIn">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="px-2 py-1 rounded bg-cyan-500/20 text-cyan-300 text-xs font-mono font-bold uppercase shrink-0">
                      {selectedFile.name.split(".").pop()}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white truncate">
                        {selectedFile.name}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile();
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0"
                    title="Remove file"
                  >
                    <svg
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              )}

              {/* Divider */}
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-800" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-[#111827] px-2 text-slate-500 font-semibold">
                    or paste contract text
                  </span>
                </div>
              </div>

              {/* Textarea */}
              <div className="relative">
                <textarea
                  rows={selectedFile ? 4 : 7}
                  value={documentText}
                  onChange={(e) => setDocumentText(e.target.value)}
                  placeholder="Paste clause or offer letter text here... (min. 50 characters)"
                  className="w-full p-3.5 rounded-xl border border-slate-800 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition text-xs sm:text-sm text-slate-200 placeholder-slate-500 bg-slate-900/80 resize-y font-mono"
                />
              </div>

              {/* Character & Action Bar */}
              <div className="mt-2.5 flex items-center justify-between text-xs">
                <span
                  className={`font-mono ${
                    characterCount >= 50
                      ? "text-emerald-400"
                      : "text-slate-500"
                  }`}
                >
                  {characterCount.toLocaleString()} chars {!selectedFile && characterCount < 50 && `(need ${50 - characterCount} more)`}
                </span>

                {documentText.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setDocumentText("")}
                    className="text-slate-400 hover:text-slate-200 underline"
                  >
                    Clear text
                  </button>
                )}
              </div>

              {/* Pre-loaded Sample Buttons */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2">
                <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
                  Test realistic trap clauses:
                </span>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      removeFile();
                      setDocumentText(SAMPLE_INTERNSHIP);
                    }}
                    className="flex-1 text-left px-3 py-2 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-700/70 text-xs text-slate-200 font-medium transition-colors flex items-center gap-2 group"
                  >
                    <span className="text-cyan-400">💼</span>
                    <span className="truncate group-hover:text-cyan-300">
                      Sample Internship Offer
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      removeFile();
                      setDocumentText(SAMPLE_RENTAL);
                    }}
                    className="flex-1 text-left px-3 py-2 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-700/70 text-xs text-slate-200 font-medium transition-colors flex items-center gap-2 group"
                  >
                    <span className="text-amber-400">🏠</span>
                    <span className="truncate group-hover:text-amber-300">
                      Sample Rental Agreement
                    </span>
                  </button>
                </div>
              </div>

              {/* Run X-Ray Scan Button */}
              <div className="mt-5">
                <button
                  type="button"
                  disabled={!canScan || loading}
                  onClick={handleScan}
                  className={`w-full py-3.5 px-6 rounded-xl font-bold text-sm tracking-wide transition-all shadow-lg flex items-center justify-center gap-2.5 ${
                    !canScan || loading
                      ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50"
                      : "bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white shadow-cyan-500/25 active:scale-[0.99] border border-cyan-400/30"
                  }`}
                >
                  {loading ? (
                    <>
                      <svg
                        className="animate-spin h-4 w-4 text-white"
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
                      <span>Scanning Document...</span>
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-4 h-4 text-cyan-200"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="2" x2="12" y2="6" />
                        <line x1="12" y1="18" x2="12" y2="22" />
                        <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
                        <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
                        <line x1="2" y1="12" x2="6" y2="12" />
                        <line x1="18" y1="12" x2="22" y2="12" />
                        <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
                        <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
                      </svg>
                      <span>Run X-Ray Scan</span>
                    </>
                  )}
                </button>
              </div>

              {/* Error Box */}
              {error && (
                <div className="mt-4 p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/50 text-rose-300 text-xs flex items-start gap-2.5">
                  <svg
                    className="w-4 h-4 text-rose-400 shrink-0 mt-0.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <div className="flex-1">
                    <p className="font-semibold text-rose-200">Scan Notice</p>
                    <p className="mt-0.5">{error}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT PANEL: Empty, Scanning, or Results */}
          <div ref={resultsRef} className="lg:col-span-7 space-y-6">
            {/* 1. EMPTY STATE: 3-step preview of what VetoAI catches */}
            {!result && !loading && (
              <div className="bg-[#111827]/90 rounded-2xl border border-slate-800 p-6 sm:p-8 backdrop-blur-md shadow-2xl">
                <div className="flex items-center gap-2 mb-6">
                  <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                  <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                    What VetoAI Detects
                  </span>
                </div>

                <div className="space-y-4">
                  {/* Step 1 */}
                  <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 flex items-start gap-4">
                    <div className="w-9 h-9 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                      <svg
                        className="w-5 h-5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">
                        1. Hidden Traps & Unreasonable Penalties
                      </h4>
                      <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                        Flags 2-year training bonds, ₹1-2 Lakh exit liquidated damages, 50% stipend withholding, and 100% IP grabs on your personal weekend projects.
                      </p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 flex items-start gap-4">
                    <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                      <svg
                        className="w-5 h-5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">
                        2. Missing Legal Protections
                      </h4>
                      <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                        Uncovers terms omitted from the agreement, like a fixed 14-day security deposit refund timeline, landlord maintenance duties, or mutual notice periods.
                      </p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/80 flex items-start gap-4">
                    <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                      <svg
                        className="w-5 h-5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <polyline points="22,6 12,13 2,6" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">
                        3. Ready-to-Send Negotiation Script
                      </h4>
                      <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                        Generates a polite, assertive counter-negotiation email with 1-click clipboard copy, so you can push back professionally before you sign.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
                  <span>⚡ Resilient Gemini Model Pipeline</span>
                  <span>🔒 Documents analyzed privately in-memory</span>
                </div>
              </div>
            )}

            {/* 2. LOADING STATE: Animated scanning stepper */}
            {loading && (
              <div className="bg-[#111827]/90 rounded-2xl border border-cyan-500/30 p-6 sm:p-8 backdrop-blur-md shadow-2xl relative overflow-hidden">
                {/* Laser scan line animation */}
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse" />

                <div className="flex items-center justify-between mb-6">
                  <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                    Running Contract X-Ray
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    Step {activeStep + 1} of 4
                  </span>
                </div>

                <div className="space-y-4">
                  {SCAN_STEPS.map((step, idx) => {
                    const isDone = idx < activeStep;
                    const isCurrent = idx === activeStep;
                    return (
                      <div
                        key={idx}
                        className={`p-3.5 rounded-xl border transition-all flex items-center gap-3 ${
                          isDone
                            ? "bg-slate-900/40 border-emerald-500/30 text-emerald-300"
                            : isCurrent
                            ? "bg-cyan-950/40 border-cyan-500/50 text-cyan-200 shadow-lg shadow-cyan-950/30"
                            : "bg-slate-900/20 border-slate-800 text-slate-500"
                        }`}
                      >
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            isDone
                              ? "bg-emerald-500 text-slate-950"
                              : isCurrent
                              ? "bg-cyan-400 text-slate-950 animate-pulse"
                              : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          {isDone ? "✓" : idx + 1}
                        </div>
                        <span className="text-xs sm:text-sm font-medium">
                          {step}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Pulsing skeleton preview */}
                <div className="mt-6 pt-5 border-t border-slate-800 space-y-3 animate-pulse">
                  <div className="w-1/3 h-4 bg-slate-800 rounded" />
                  <div className="w-full h-8 bg-slate-800/60 rounded" />
                  <div className="w-4/5 h-8 bg-slate-800/40 rounded" />
                </div>
              </div>
            )}

            {/* 3. RESULTS STATE: Risk Gauge + Flagged Clauses + Missing Protections + Email */}
            {result && !loading && (
              <div className="space-y-6 animate-fadeIn">
                {/* Risk Score Summary Banner */}
                <div className="bg-[#111827]/90 rounded-2xl border border-slate-800 p-6 sm:p-7 backdrop-blur-md shadow-2xl">
                  <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
                    {/* Circular SVG Gauge */}
                    <div className="relative w-32 h-32 shrink-0 flex items-center justify-center">
                      <svg
                        className="w-full h-full transform -rotate-90"
                        viewBox="0 0 120 120"
                      >
                        <circle
                          cx="60"
                          cy="60"
                          r={radius}
                          strokeWidth="10"
                          className="stroke-slate-800 fill-none"
                        />
                        <circle
                          cx="60"
                          cy="60"
                          r={radius}
                          strokeWidth="10"
                          strokeDasharray={circumference}
                          strokeDashoffset={strokeDashoffset}
                          strokeLinecap="round"
                          className={`${riskMeta.stroke} fill-none transition-all duration-1000 ease-out`}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span
                          className={`text-3xl font-extrabold tracking-tight ${riskMeta.text}`}
                        >
                          {result.riskScore}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          / 100 Risk
                        </span>
                      </div>
                    </div>

                    {/* Summary text */}
                    <div className="flex-1 text-center sm:text-left">
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-2">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider ${riskMeta.badgeBg}`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${riskMeta.dot}`}
                          ></span>
                          {result.overallRisk} Risk Level
                        </span>
                        <span className="text-xs text-slate-400">
                          {result.flaggedClauses.length} Flagged • {result.missingProtections.length} Missing
                        </span>
                      </div>

                      <h3 className="text-base sm:text-lg font-bold text-white">
                        Executive Risk Analysis
                      </h3>
                      <p className="mt-1.5 text-xs sm:text-sm text-slate-300 leading-relaxed">
                        {result.summary}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Flagged Clauses Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                      <span>⚠️</span>
                      Flagged Trap Clauses ({result.flaggedClauses.length})
                    </h3>
                  </div>

                  {result.flaggedClauses.length === 0 ? (
                    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400">
                      No high-risk clauses were flagged in this excerpt.
                    </div>
                  ) : (
                    result.flaggedClauses.map((clause, idx) => {
                      const cRisk = getRiskMeta(
                        clause.risk === "High" ? 85 : clause.risk === "Medium" ? 50 : 20,
                        clause.risk
                      );
                      return (
                        <div
                          key={idx}
                          className={`p-4 sm:p-5 rounded-xl bg-[#111827]/90 border border-slate-800 ${cRisk.border} border-l-4 shadow-lg space-y-2.5`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-sm font-bold text-white">
                              {clause.title}
                            </h4>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider shrink-0 ${cRisk.badgeBg}`}
                            >
                              {clause.risk}
                            </span>
                          </div>

                          {clause.quote && (
                            <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs italic text-slate-300">
                              <span className="text-cyan-400 mr-1 font-serif text-sm">“</span>
                              {clause.quote}
                              <span className="text-cyan-400 ml-1 font-serif text-sm">”</span>
                            </div>
                          )}

                          <div className="text-xs text-slate-300 leading-relaxed">
                            <span className="font-semibold text-slate-200 block text-[11px] uppercase tracking-wider text-slate-400 mb-0.5">
                              Why it matters:
                            </span>
                            {clause.whyItMatters}
                          </div>

                          <div className="pt-2 border-t border-slate-800/80 bg-cyan-950/20 -mx-4 -mb-4 sm:-mx-5 sm:-mb-5 p-3 sm:p-4 rounded-b-xl">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5 mb-1">
                              <span>💬</span> How to push back:
                            </span>
                            <p className="text-xs font-medium text-cyan-200">
                              &ldquo;{clause.negotiationLine}&rdquo;
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Missing Protections Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                      <span>🛡️</span>
                      Missing Protections ({result.missingProtections.length})
                    </h3>
                  </div>

                  {result.missingProtections.length === 0 ? (
                    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400">
                      No critical standard protections were missing.
                    </div>
                  ) : (
                    result.missingProtections.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-4 sm:p-5 rounded-xl bg-[#111827]/90 border border-slate-800 border-l-4 border-l-amber-400 shadow-lg space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                            <span className="text-amber-400">●</span>
                            {item.title}
                          </h4>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 uppercase tracking-wider">
                            Missing
                          </span>
                        </div>

                        <p className="text-xs text-slate-300 leading-relaxed">
                          {item.whyItMatters}
                        </p>

                        <div className="p-2.5 rounded-lg bg-amber-950/20 border border-amber-500/20 text-xs">
                          <span className="font-bold text-amber-300 block text-[11px] uppercase tracking-wider mb-0.5">
                            Ask to add:
                          </span>
                          <span className="text-amber-100 font-medium">
                            &ldquo;{item.askFor}&rdquo;
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Ready-to-Send Negotiation Email */}
                <div className="bg-[#111827]/90 rounded-2xl border border-slate-800 p-5 sm:p-6 backdrop-blur-md shadow-2xl space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                        <span className="text-cyan-400">✉️</span>
                        Ready-to-Send Negotiation Email
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Diplomatic counter-proposal drafted by VetoAI
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleCopyEmail}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-md ${
                        copied
                          ? "bg-emerald-500 text-slate-950 shadow-emerald-500/20"
                          : "bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-cyan-500/20"
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

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Subject Line:
                    </span>
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-200">
                      {result.negotiationEmail.subject}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Email Body:
                    </span>
                    <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs sm:text-sm text-slate-300 whitespace-pre-wrap leading-relaxed max-h-[380px] overflow-y-auto font-sans">
                      {result.negotiationEmail.body}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
