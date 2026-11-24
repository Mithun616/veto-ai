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
  const [displayScore, setDisplayScore] = useState(0);
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
    }, 1500);

    return () => clearInterval(interval);
  }, [loading]);

  // Smooth SVG Score gauge animation on result change
  useEffect(() => {
    if (!result) return;

    const target = result.riskScore;
    let startTimestamp: number | null = null;
    const duration = 900; // ms

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      setDisplayScore(Math.round(progress * target));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };

    const animFrame = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(animFrame);
  }, [result]);

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
    setDisplayScore(0);
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
          : "AI servers are experiencing high demand right now. Please wait a few seconds and click Run X-Ray Scan again.";
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
        verdict: "High Risk — Don't sign as-is",
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
        verdict: "Medium Risk — Ask for changes",
        dot: "bg-amber-400",
        label: "Medium Risk",
      };
    }
    return {
      badgeBg: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300",
      stroke: "stroke-[#D4FF2A]",
      text: "text-[#D4FF2A]",
      border: "border-l-[#D4FF2A]",
      verdict: "Low Risk — Looks fair",
      dot: "bg-[#D4FF2A]",
      label: "Low Risk",
    };
  };

  const riskMeta = result
    ? getRiskMeta(result.riskScore, result.overallRisk)
    : getRiskMeta(50);

  // SVG Gauge calculations
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (circumference * displayScore) / 100;

  return (
    <div className="min-h-screen bg-[#05070C] text-[#F8FAFC] flex flex-col font-sans selection:bg-[#D4FF2A] selection:text-[#05070C] relative">
      {/* Soft Cobalt Blue Radial Glow behind Hero */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[520px] bg-gradient-to-b from-[#2563EB]/15 via-[#2563EB]/5 to-transparent blur-3xl pointer-events-none -z-10" />

      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-[#05070C]/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* VetoAI Shield Mark */}
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#D4FF2A] via-[#60A5FA] to-[#2563EB] p-[1.5px] shadow-lg shadow-[#D4FF2A]/10">
              <div className="w-full h-full bg-[#05070C] rounded-[10px] flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-[#D4FF2A]"
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

            <div className="flex items-center gap-2">
              <span className="text-xl font-extrabold tracking-tight text-white">
                Veto<span className="text-[#60A5FA]">AI</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase bg-[#D4FF2A]/10 text-[#D4FF2A] border border-[#D4FF2A]/30">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D4FF2A] animate-pulse"></span>
              EDUCATIONAL REVIEW • NOT LEGAL ADVICE
            </span>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-12 pb-8 text-center px-4 max-w-4xl mx-auto">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.15] text-[#F8FAFC]">
          <span className="font-serif italic font-normal text-[#D4FF2A] mr-2">Spot</span>
          Every <span className="text-[#60A5FA]">Trap</span> Before You Sign.
        </h1>
        <p className="mt-4 text-[#CBD5E1] text-[15px] sm:text-base leading-relaxed max-w-xl mx-auto font-normal">
          Instant plain-English document audit for students, tenants, and freshers. Expose bonds, deposit traps, and generate your pushback script in seconds.
        </p>

        {/* Minimal 3-Column Hairline Strip */}
        <div className="mt-8 max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-white/10 rounded-2xl border border-white/10 bg-[#0B101D]/70 backdrop-blur-md">
          <div className="py-3 px-4 text-center">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#D4FF2A] block">
              01 / TRAP SCAN
            </span>
            <span className="text-xs text-[#CBD5E1] mt-0.5 block">
              Bonds, exit fees & IP grabs
            </span>
          </div>
          <div className="py-3 px-4 text-center">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#60A5FA] block">
              02 / MISSING RIGHTS
            </span>
            <span className="text-xs text-[#CBD5E1] mt-0.5 block">
              Absent refunds & notice terms
            </span>
          </div>
          <div className="py-3 px-4 text-center">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-white block">
              03 / PUSHBACK EMAIL
            </span>
            <span className="text-xs text-[#CBD5E1] mt-0.5 block">
              Polite counter-proposal ready
            </span>
          </div>
        </div>
      </section>

      {/* Split Screen Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-4 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
          {/* LEFT PANEL: Ingestion & Upload */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-[#0B101D]/90 rounded-2xl border border-white/10 shadow-2xl p-6 sm:p-7 backdrop-blur-md relative">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#60A5FA] flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#60A5FA]"></span>
                  Upload or Paste
                </span>
                <span className="text-[11px] text-[#CBD5E1] font-mono">
                  PDF • DOCX • TXT (≤ 4 MB)
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
                className={`relative rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-all duration-200 ${
                  isDragging
                    ? "border-[#D4FF2A] bg-[#D4FF2A]/5 shadow-[0_0_24px_rgba(212,255,42,0.15)] scale-[1.01]"
                    : "border-white/15 hover:border-[#60A5FA]/60 bg-[#05070C]/60 hover:bg-[#05070C]/90"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.txt"
                  className="hidden"
                  onChange={handleFileChange}
                />

                <div className="flex flex-col items-center justify-center gap-2.5">
                  <div className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#60A5FA]">
                    <svg
                      className="w-5 h-5"
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
                    <p className="text-sm font-semibold text-[#F8FAFC]">
                      Drop contract file here
                    </p>
                    <p className="text-xs text-[#CBD5E1] mt-0.5">
                      or <span className="text-[#60A5FA] underline">browse files</span> (.pdf, .docx, .txt)
                    </p>
                  </div>
                </div>
              </div>

              {/* Selected File Card */}
              {selectedFile && (
                <div className="mt-3 p-3 rounded-xl bg-white/5 border border-[#60A5FA]/40 flex items-center justify-between gap-3 animate-fade-up">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="px-2 py-0.5 rounded bg-[#60A5FA]/20 text-[#60A5FA] text-xs font-mono font-bold uppercase shrink-0">
                      {selectedFile.name.split(".").pop()}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white truncate">
                        {selectedFile.name}
                      </p>
                      <p className="text-[11px] text-[#CBD5E1]">
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

              {/* Textarea Divider */}
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center text-xs uppercase font-mono">
                  <span className="bg-[#0B101D] px-2 text-[#CBD5E1] font-semibold text-[11px]">
                    or paste clause text
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
                  className="w-full p-4 rounded-xl border border-white/10 focus:border-[#60A5FA] focus:ring-1 focus:ring-[#60A5FA]/50 transition text-sm text-[#F8FAFC] placeholder-slate-500 bg-[#05070C]/80 resize-y font-mono leading-relaxed"
                />
              </div>

              {/* Character Bar */}
              <div className="mt-2.5 flex items-center justify-between text-xs">
                <span
                  className={`font-mono text-xs ${
                    characterCount >= 50
                      ? "text-[#D4FF2A]"
                      : "text-slate-500"
                  }`}
                >
                  {characterCount.toLocaleString()} chars {!selectedFile && characterCount < 50 && `(need ${50 - characterCount} more)`}
                </span>

                {documentText.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setDocumentText("")}
                    className="text-[#CBD5E1] hover:text-white underline underline-offset-2"
                  >
                    Clear text
                  </button>
                )}
              </div>

              {/* Pre-loaded Sample Buttons */}
              <div className="mt-5 pt-4 border-t border-white/10 space-y-2">
                <span className="text-[11px] font-mono font-semibold text-[#CBD5E1] block uppercase tracking-wider">
                  Test sample contracts:
                </span>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      removeFile();
                      setDocumentText(SAMPLE_INTERNSHIP);
                    }}
                    className="flex-1 text-left px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-[#CBD5E1] font-medium transition-colors flex items-center gap-2 group"
                  >
                    <span>💼</span>
                    <span className="truncate group-hover:text-white">
                      Internship Offer (Bond Trap)
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      removeFile();
                      setDocumentText(SAMPLE_RENTAL);
                    }}
                    className="flex-1 text-left px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-[#CBD5E1] font-medium transition-colors flex items-center gap-2 group"
                  >
                    <span>🏠</span>
                    <span className="truncate group-hover:text-white">
                      Rental Agreement (Deposit Trap)
                    </span>
                  </button>
                </div>
              </div>

              {/* Primary Pill Action: Run X-Ray Scan → */}
              <div className="mt-6">
                <button
                  type="button"
                  disabled={!canScan || loading}
                  onClick={handleScan}
                  className={`w-full py-4 px-8 rounded-full font-bold text-sm tracking-wide transition-all duration-200 flex items-center justify-center gap-2 ${
                    !canScan || loading
                      ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5"
                      : "bg-[#D4FF2A] hover:bg-[#c2ed18] text-[#05070C] shadow-[0_0_24px_rgba(212,255,42,0.25)] hover:shadow-[0_0_32px_rgba(212,255,42,0.4)] active:scale-[0.98]"
                  }`}
                >
                  {loading ? (
                    <>
                      <svg
                        className="animate-spin h-4 w-4 text-[#05070C]"
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
                      <span>Run X-Ray Scan</span>
                      <span className="text-base leading-none">→</span>
                    </>
                  )}
                </button>
              </div>

              {/* Error Box */}
              {error && (
                <div className="mt-4 p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-3">
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
                  <div className="flex-1 leading-relaxed">
                    <p className="font-semibold text-rose-100">Notice</p>
                    <p className="mt-0.5">{error}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT PANEL: Empty, Scanning, or Results */}
          <div ref={resultsRef} className="lg:col-span-7 space-y-6">
            {/* 1. EMPTY STATE: 3-step preview */}
            {!result && !loading && (
              <div className="bg-[#0B101D]/90 rounded-2xl border border-white/10 p-6 sm:p-8 backdrop-blur-md shadow-2xl">
                <div className="flex items-center gap-2 mb-6">
                  <span className="w-2 h-2 rounded-full bg-[#D4FF2A]"></span>
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#D4FF2A]">
                    X-Ray Breakdown
                  </span>
                </div>

                <div className="space-y-4">
                  <div className="p-4 sm:p-5 rounded-xl bg-white/[0.03] border border-white/10 flex items-start gap-4">
                    <div className="w-9 h-9 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0 font-bold text-sm">
                      01
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">
                        Hidden Traps & Exit Penalties
                      </h4>
                      <p className="mt-1 text-xs sm:text-[13px] text-[#CBD5E1] leading-relaxed">
                        Flags 2-year bonds, ₹2L exit penalties, 50% stipend withholding, and claims on your weekend personal code.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 sm:p-5 rounded-xl bg-white/[0.03] border border-white/10 flex items-start gap-4">
                    <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 font-bold text-sm">
                      02
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">
                        Missing Protective Safeguards
                      </h4>
                      <p className="mt-1 text-xs sm:text-[13px] text-[#CBD5E1] leading-relaxed">
                        Finds what is conspicuously missing—like explicit 14-day deposit return deadlines and mutual termination notice.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 sm:p-5 rounded-xl bg-white/[0.03] border border-white/10 flex items-start gap-4">
                    <div className="w-9 h-9 rounded-lg bg-[#60A5FA]/10 border border-[#60A5FA]/30 flex items-center justify-center text-[#60A5FA] shrink-0 font-bold text-sm">
                      03
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">
                        Polite Counter-Proposal Email
                      </h4>
                      <p className="mt-1 text-xs sm:text-[13px] text-[#CBD5E1] leading-relaxed">
                        Drafts a diplomatic response you can copy and send directly to push back professionally before signing.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-[#CBD5E1] font-mono">
                  <span>⚡ Multi-LLM Fallback Engine</span>
                  <span>🔒 Processed securely in-memory</span>
                </div>
              </div>
            )}

            {/* 2. LOADING STATE: X-Ray Laser Beam & Stepper */}
            {loading && (
              <div className="bg-[#0B101D]/90 rounded-2xl border border-[#60A5FA]/30 p-6 sm:p-8 backdrop-blur-md shadow-2xl relative overflow-hidden">
                {/* Glowing Acid Lime + Cobalt Blue Laser Beam sweeping vertically */}
                <div className="absolute left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#D4FF2A] to-[#60A5FA] blur-[1px] animate-xray-laser shadow-[0_0_15px_#D4FF2A]" />

                <div className="flex items-center justify-between mb-6">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#D4FF2A] flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#D4FF2A] animate-ping"></span>
                    Scanning Document
                  </span>
                  <span className="text-xs text-[#CBD5E1] font-mono">
                    Step {activeStep + 1} of 4
                  </span>
                </div>

                <div className="space-y-3.5">
                  {SCAN_STEPS.map((step, idx) => {
                    const isDone = idx < activeStep;
                    const isCurrent = idx === activeStep;
                    return (
                      <div
                        key={idx}
                        className={`p-3.5 rounded-xl border transition-all duration-300 flex items-center gap-3 ${
                          isDone
                            ? "bg-white/[0.02] border-[#D4FF2A]/30 text-[#D4FF2A]"
                            : isCurrent
                            ? "bg-[#60A5FA]/10 border-[#60A5FA]/60 text-white shadow-lg shadow-[#60A5FA]/10"
                            : "bg-white/[0.01] border-white/5 text-slate-500"
                        }`}
                      >
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-mono ${
                            isDone
                              ? "bg-[#D4FF2A] text-[#05070C]"
                              : isCurrent
                              ? "bg-[#60A5FA] text-[#05070C] animate-pulse"
                              : "bg-white/10 text-slate-400"
                          }`}
                        >
                          {isDone ? "✓" : idx + 1}
                        </div>
                        <span className="text-sm font-medium">
                          {step}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. RESULTS STATE: Verdict + Flags + Missing + Email */}
            {result && !loading && (
              <div className="space-y-6 animate-fade-up">
                {/* Verdict Card with Animated Circular SVG Risk Gauge */}
                <div className="bg-[#0B101D]/90 rounded-2xl border border-white/10 p-6 sm:p-7 backdrop-blur-md shadow-2xl">
                  <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-7">
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
                          className="stroke-white/10 fill-none"
                        />
                        <circle
                          cx="60"
                          cy="60"
                          r={radius}
                          strokeWidth="10"
                          strokeDasharray={circumference}
                          strokeDashoffset={strokeDashoffset}
                          strokeLinecap="round"
                          className={`${riskMeta.stroke} fill-none transition-all duration-700 ease-out`}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span
                          className={`text-3xl font-black tracking-tight ${riskMeta.text}`}
                        >
                          {displayScore}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-[#CBD5E1] uppercase tracking-widest">
                          / 100 Risk
                        </span>
                      </div>
                    </div>

                    {/* Verdict & Plain-English Summary */}
                    <div className="flex-1 text-center sm:text-left">
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-2">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider font-mono ${riskMeta.badgeBg}`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${riskMeta.dot}`}
                          ></span>
                          {riskMeta.verdict}
                        </span>
                        <span className="text-xs text-[#CBD5E1] font-mono">
                          {result.flaggedClauses.length} Flagged • {result.missingProtections.length} Missing
                        </span>
                      </div>

                      <h3 className="text-lg font-bold text-white mt-1">
                        Executive Verdict
                      </h3>
                      <p className="mt-1.5 text-[15px] text-[#CBD5E1] leading-relaxed font-normal">
                        {result.summary}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Flagged Clauses Section */}
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                      <span>⚠️</span>
                      Flagged Traps ({result.flaggedClauses.length})
                    </h3>
                  </div>

                  {result.flaggedClauses.length === 0 ? (
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 text-xs text-[#CBD5E1]">
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
                          className={`p-5 rounded-xl bg-[#0B101D]/90 border border-white/10 ${cRisk.border} border-l-4 shadow-lg space-y-3`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <h4 className="text-sm sm:text-[15px] font-bold text-white">
                              {clause.title}
                            </h4>
                            <span
                              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider shrink-0 ${cRisk.badgeBg}`}
                            >
                              {clause.risk}
                            </span>
                          </div>

                          {clause.quote && (
                            <div className="p-3 rounded-lg bg-[#05070C] border border-white/10 text-xs italic text-[#CBD5E1] font-mono">
                              <span className="text-[#D4FF2A] mr-1 font-serif text-sm">“</span>
                              {clause.quote}
                              <span className="text-[#D4FF2A] ml-1 font-serif text-sm">”</span>
                            </div>
                          )}

                          <div className="text-[14px] text-[#CBD5E1] leading-relaxed">
                            <span className="font-semibold text-white block text-[11px] uppercase tracking-wider text-slate-400 mb-0.5 font-mono">
                              Why it hurts:
                            </span>
                            {clause.whyItMatters}
                          </div>

                          <div className="pt-2.5 border-t border-white/10 bg-white/[0.02] -mx-5 -mb-5 p-4 rounded-b-xl">
                            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#60A5FA] flex items-center gap-1.5 mb-1">
                              <span>💬</span> What to say:
                            </span>
                            <p className="text-sm font-medium text-[#F8FAFC]">
                              &ldquo;{clause.negotiationLine}&rdquo;
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Missing Protections Section */}
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                      <span>🛡️</span>
                      Missing Rights ({result.missingProtections.length})
                    </h3>
                  </div>

                  {result.missingProtections.length === 0 ? (
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 text-xs text-[#CBD5E1]">
                      No critical standard protections were missing.
                    </div>
                  ) : (
                    result.missingProtections.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-5 rounded-xl bg-[#0B101D]/90 border border-white/10 border-l-4 border-l-amber-400 shadow-lg space-y-2.5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <h4 className="text-sm sm:text-[15px] font-bold text-white flex items-center gap-2">
                            <span className="text-amber-400 font-bold">●</span>
                            {item.title}
                          </h4>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 uppercase tracking-wider">
                            Missing
                          </span>
                        </div>

                        <p className="text-[14px] text-[#CBD5E1] leading-relaxed">
                          {item.whyItMatters}
                        </p>

                        <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-500/20 text-xs sm:text-[13px]">
                          <span className="font-bold text-amber-300 block text-[11px] font-mono uppercase tracking-wider mb-1">
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

                {/* Sticky Negotiation Email Card */}
                <div className="bg-[#0B101D]/90 rounded-2xl border border-white/10 p-6 backdrop-blur-md shadow-2xl space-y-4">
                  <div className="flex items-center justify-between pb-4 border-b border-white/10">
                    <div>
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <span>✉️</span>
                        Ready-to-Send Pushback Email
                      </h3>
                      <p className="text-xs text-[#CBD5E1] mt-0.5">
                        Diplomatic counter-proposal drafted by VetoAI
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleCopyEmail}
                      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 shadow-md ${
                        copied
                          ? "bg-emerald-400 text-[#05070C]"
                          : "bg-[#D4FF2A] hover:bg-[#c2ed18] text-[#05070C] hover:shadow-[0_0_20px_rgba(212,255,42,0.35)] active:scale-95"
                      }`}
                    >
                      {copied ? (
                        <>
                          <span>Copied! ✓</span>
                        </>
                      ) : (
                        <>
                          <span>Copy Email</span>
                          <span>→</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Subject Line:
                    </span>
                    <div className="p-3 rounded-lg bg-[#05070C] border border-white/10 text-xs font-semibold text-white">
                      {result.negotiationEmail.subject}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Email Body:
                    </span>
                    <div className="p-4 rounded-xl bg-[#05070C] border border-white/10 text-sm text-[#CBD5E1] whitespace-pre-wrap leading-relaxed max-h-[360px] overflow-y-auto font-sans">
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
