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
  const [activeTab, setActiveTab] = useState<"paste" | "upload">("paste");
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

  const characterCount = documentText.length;
  const canScan =
    activeTab === "upload" ? selectedFile !== null : characterCount >= 50;

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
      setError(
        `File is too large (${(file.size / (1024 * 1024)).toFixed(
          1
        )} MB). Max limit is 4 MB.`
      );
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

  // Strictly 3 colors: Obsidian (#05070C), Cobalt (#2563EB/#60A5FA), Acid Lime (#D4FF2A)
  const getRiskMeta = (score: number, riskLevel?: string) => {
    if (score >= 70 || riskLevel === "High") {
      return {
        pill: "bg-[#D4FF2A] text-[#05070C] font-bold",
        verdict: "HIGH RISK — DO NOT SIGN AS-IS",
        color: "text-[#D4FF2A]",
        ringColor: "#D4FF2A",
        label: "HIGH",
      };
    }
    if (score >= 35 || riskLevel === "Medium") {
      return {
        pill: "bg-[#2563EB] text-white font-bold",
        verdict: "MEDIUM RISK — ASK FOR CHANGES",
        color: "text-[#60A5FA]",
        ringColor: "#60A5FA",
        label: "MEDIUM",
      };
    }
    return {
      pill: "border border-[#60A5FA]/50 text-[#60A5FA] font-medium",
      verdict: "LOW RISK — LOOKS FAIR",
      color: "text-[#60A5FA]",
      ringColor: "#2563EB",
      label: "LOW",
    };
  };

  const riskMeta = result
    ? getRiskMeta(result.riskScore, result.overallRisk)
    : getRiskMeta(50);

  // SVG Gauge calculations
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference - (circumference * displayScore) / 100;

  // Live Risk Composition calculation for pure SVG Donut Chart
  const highTrapsCount = result
    ? result.flaggedClauses.filter((c) => c.risk === "High").length
    : 0;
  const medLowTrapsCount = result
    ? result.flaggedClauses.filter((c) => c.risk !== "High").length
    : 0;
  const missingRightsCount = result ? result.missingProtections.length : 0;
  const totalFindings = highTrapsCount + medLowTrapsCount + missingRightsCount;

  const donutR = 32;
  const donutC = 2 * Math.PI * donutR;

  const highDash =
    totalFindings > 0 ? (highTrapsCount / totalFindings) * donutC : 0;
  const medLowDash =
    totalFindings > 0 ? (medLowTrapsCount / totalFindings) * donutC : 0;
  const missingDash =
    totalFindings > 0 ? (missingRightsCount / totalFindings) * donutC : 0;

  const highOffset = 0;
  const medLowOffset = -highDash;
  const missingOffset = -(highDash + medLowDash);

  return (
    <div className="min-h-screen bg-[#05070C] text-[#F8FAFC] flex flex-col font-sans selection:bg-[#D4FF2A] selection:text-[#05070C] relative">
      {/* Soft Cobalt Blue Radial Glow behind Hero */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[520px] bg-gradient-to-b from-[#2563EB]/15 via-[#2563EB]/5 to-transparent blur-3xl pointer-events-none -z-10" />

      {/* Top Navbar: max-w-7xl px-6 sm:px-8 lg:px-12 */}
      <header className="sticky top-0 z-40 bg-[#05070C]/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 h-16 flex items-center justify-between">
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

            <span className="text-xl font-extrabold tracking-tight text-white">
              Veto<span className="text-[#60A5FA]">AI</span>
            </span>
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
      <section className="pt-14 pb-10 text-center px-4 max-w-4xl mx-auto">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.15] text-[#F8FAFC]">
          <span className="font-serif italic font-normal text-[#D4FF2A] mr-2">
            Spot
          </span>
          Every <span className="text-[#60A5FA]">Trap</span> Before You Sign.
        </h1>
        <p className="mt-4 text-[#CBD5E1] text-base sm:text-lg font-normal tracking-wide max-w-xl mx-auto">
          Drop any contract. Expose hidden traps. Copy your pushback.
        </p>
      </section>

      {/* Main Single Centered Command Stage: max-w-4xl mx-auto */}
      <main className="w-full max-w-4xl mx-auto px-4 sm:px-6">
        <div className="rounded-2xl border border-white/10 bg-[#0A0F1C]/90 p-5 sm:p-7 backdrop-blur-md shadow-2xl relative">
          {/* Top Bar: Segmented Tab Switch + Minimal Sample Links */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
            {/* Segmented Tab Switch */}
            <div className="inline-flex p-1 rounded-xl bg-[#05070C] border border-white/10 self-start">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("paste");
                  setError(null);
                }}
                className={`px-4 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all ${
                  activeTab === "paste"
                    ? "bg-[#2563EB] text-white shadow-md shadow-[#2563EB]/20"
                    : "text-[#CBD5E1] hover:text-white"
                }`}
              >
                Paste Clause
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("upload");
                  setError(null);
                }}
                className={`px-4 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all ${
                  activeTab === "upload"
                    ? "bg-[#2563EB] text-white shadow-md shadow-[#2563EB]/20"
                    : "text-[#CBD5E1] hover:text-white"
                }`}
              >
                Upload PDF / DOCX
              </button>
            </div>

            {/* Minimal Sample Links */}
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="text-slate-500 text-[11px] uppercase tracking-wider">
                Samples:
              </span>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("paste");
                  setDocumentText(SAMPLE_INTERNSHIP);
                  setSelectedFile(null);
                  setError(null);
                }}
                className="text-[#60A5FA] hover:text-[#D4FF2A] transition-colors underline-offset-4 hover:underline"
              >
                Internship Sample ↗
              </button>
              <span className="text-white/20">·</span>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("paste");
                  setDocumentText(SAMPLE_RENTAL);
                  setSelectedFile(null);
                  setError(null);
                }}
                className="text-[#60A5FA] hover:text-[#D4FF2A] transition-colors underline-offset-4 hover:underline"
              >
                Rental Sample ↗
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="py-4">
            {activeTab === "paste" ? (
              <textarea
                value={documentText}
                onChange={(e) => setDocumentText(e.target.value)}
                rows={7}
                placeholder="Paste offer letter, rental agreement, or contract clause here... (min. 50 characters)"
                className="w-full bg-[#05070C]/70 text-[#F8FAFC] placeholder-slate-500 border border-white/10 rounded-xl p-4 text-[15px] font-mono leading-relaxed focus:outline-none focus:border-[#60A5FA] transition-colors resize-y min-h-[180px]"
              />
            ) : (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.txt"
                  className="hidden"
                  onChange={handleFileChange}
                />
                {!selectedFile ? (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleFileDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`rounded-xl border border-dashed p-8 text-center cursor-pointer transition-all ${
                      isDragging
                        ? "border-[#D4FF2A] bg-[#D4FF2A]/5 scale-[1.01]"
                        : "border-white/15 hover:border-[#60A5FA]/60 bg-[#05070C]/60 hover:bg-[#05070C]/90"
                    }`}
                  >
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#60A5FA]">
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
                        <p className="text-sm font-semibold text-white">
                          Drop PDF or DOCX contract here
                        </p>
                        <p className="text-xs text-[#CBD5E1] mt-1 font-mono">
                          or <span className="text-[#60A5FA] underline">browse files</span> (.pdf, .docx, .txt up to 4 MB)
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-[#05070C]/90 border border-[#60A5FA]/40 flex items-center justify-between gap-3 animate-fade-up">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="px-2.5 py-1 rounded bg-[#2563EB]/20 text-[#60A5FA] text-xs font-mono font-bold uppercase shrink-0">
                        {selectedFile.name.split(".").pop()}
                      </span>
                      <span className="text-sm font-medium text-white truncate">
                        {selectedFile.name}
                      </span>
                      <span className="text-xs text-[#CBD5E1] font-mono shrink-0">
                        • {(selectedFile.size / 1024).toFixed(1)} KB
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={removeFile}
                      className="px-3 py-1.5 text-xs font-mono text-[#CBD5E1] hover:text-white hover:bg-white/10 rounded-lg transition-colors shrink-0"
                    >
                      Remove ✕
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3.5 rounded-xl bg-[#2563EB]/10 border border-[#60A5FA]/40 text-sm text-[#F8FAFC] flex items-center gap-2.5 font-mono">
              <span className="text-[#60A5FA] font-bold">!</span>
              <span>{error}</span>
            </div>
          )}

          {/* Bottom Bar: Character / File Status + Acid Lime Pill CTA */}
          <div className="flex items-center justify-between pt-4 border-t border-white/10">
            <div className="text-xs font-mono text-[#CBD5E1]">
              {activeTab === "paste" ? (
                <span>
                  <strong className="text-white font-semibold">
                    {characterCount}
                  </strong>{" "}
                  chars
                  {characterCount < 50 && (
                    <span className="text-slate-500 ml-1.5">(min 50)</span>
                  )}
                </span>
              ) : (
                <span>
                  {selectedFile ? (
                    <span className="text-[#D4FF2A] font-semibold">
                      Ready to scan
                    </span>
                  ) : (
                    <span className="text-slate-500">No file selected</span>
                  )}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleScan}
              disabled={!canScan || loading}
              className="bg-[#D4FF2A] hover:bg-[#b8e617] text-[#05070C] font-bold text-sm px-7 py-2.5 rounded-full transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(212,255,42,0.25)] flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? "Scanning..." : "Run X-Ray Scan →"}
            </button>
          </div>
        </div>

        {/* Loading State: Confined Laser Scanner */}
        {loading && (
          <div className="mt-8 rounded-2xl border border-[#60A5FA]/30 bg-[#0A0F1C]/90 p-6 sm:p-8 overflow-hidden backdrop-blur-md shadow-2xl relative animate-fade-up">
            {/* Confined laser beam in background (z-0) */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
              <div className="absolute left-0 right-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#D4FF2A] to-[#60A5FA] blur-[0.5px] animate-xray-laser shadow-[0_0_12px_#D4FF2A]" />
            </div>

            <div className="relative z-10">
              <div className="flex items-center justify-between pb-4 mb-6 border-b border-white/10">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#D4FF2A] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#D4FF2A] animate-ping"></span>
                  Scanning Document
                </span>
                <span className="text-xs text-[#CBD5E1] font-mono">
                  Step {activeStep + 1} of 4
                </span>
              </div>

              <div className="space-y-3">
                {SCAN_STEPS.map((step, idx) => {
                  const isDone = idx < activeStep;
                  const isCurrent = idx === activeStep;
                  return (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-xl border transition-all duration-300 flex items-center gap-3 ${
                        isDone
                          ? "bg-[#05070C]/80 border-[#D4FF2A]/30 text-[#D4FF2A]"
                          : isCurrent
                          ? "bg-[#2563EB]/15 border-[#60A5FA]/60 text-white shadow-lg shadow-[#2563EB]/10"
                          : "bg-[#05070C]/40 border-white/5 text-slate-500"
                      }`}
                    >
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-mono shrink-0 ${
                          isDone
                            ? "bg-[#D4FF2A] text-[#05070C]"
                            : isCurrent
                            ? "bg-[#60A5FA] text-[#05070C] animate-pulse"
                            : "bg-white/10 text-slate-400"
                        }`}
                      >
                        {isDone ? "✓" : idx + 1}
                      </div>
                      <span className="text-sm font-medium">{step}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Minimal, Ultra-Readable Results: max-w-7xl px-6 sm:px-8 lg:px-12 */}
      {result && !loading && (
        <section
          ref={resultsRef}
          className="w-full max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 mt-12 mb-20 space-y-10 animate-fade-up"
        >
          {/* Top Executive Verdict Banner (3-Part Horizontal Bar on Desktop) */}
          <div className="p-7 sm:p-8 rounded-2xl bg-[#0A0F1C] border border-white/10 backdrop-blur-md shadow-2xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Part 1: Circular Risk Score Gauge */}
            <div className="lg:col-span-3 flex flex-col sm:flex-row lg:flex-col items-center justify-center gap-4 text-center sm:text-left lg:text-center">
              <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
                <svg
                  className="w-full h-full transform -rotate-90"
                  viewBox="0 0 120 120"
                >
                  <circle
                    cx="60"
                    cy="60"
                    r={radius}
                    strokeWidth="8"
                    className="stroke-[#2563EB]/20"
                    fill="transparent"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r={radius}
                    strokeWidth="8"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                    stroke={riskMeta.ringColor}
                    fill="transparent"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-black text-white tracking-tight">
                    {displayScore}
                  </span>
                  <span className="text-[10px] font-mono uppercase text-[#CBD5E1] tracking-widest">
                    / 100
                  </span>
                </div>
              </div>
              <div>
                <div className="text-xs font-mono uppercase tracking-wider text-[#60A5FA]">
                  Risk Score
                </div>
                <div className="text-xs text-slate-400 font-mono mt-0.5">
                  {displayScore >= 70
                    ? "Severe Trap Risk"
                    : displayScore >= 35
                    ? "Moderate Trap Risk"
                    : "Low Trap Risk"}
                </div>
              </div>
            </div>

            {/* Part 2: Verdict Heading + 1-2 Sentence Summary */}
            <div className="lg:col-span-5 space-y-2.5 text-center sm:text-left border-t lg:border-t-0 lg:border-l border-white/10 pt-6 lg:pt-0 lg:pl-8">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-mono ${riskMeta.pill}`}
                >
                  {riskMeta.verdict}
                </span>
                <span className="text-xs font-mono text-[#CBD5E1]">
                  {result.flaggedClauses.length} Flagged ·{" "}
                  {result.missingProtections.length} Missing
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Executive Verdict
              </h2>
              <p className="text-[#F8FAFC] text-[15px] sm:text-base leading-relaxed font-normal">
                {result.summary}
              </p>
            </div>

            {/* Part 3: Risk Composition Donut Chart + Mini Fairness vs Risk Bar */}
            <div className="lg:col-span-4 flex flex-col justify-center border-t lg:border-t-0 lg:border-l border-white/10 pt-6 lg:pt-0 lg:pl-8">
              <div className="flex items-center gap-5 justify-center sm:justify-start">
                {/* Pure SVG Donut Chart */}
                <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
                  <svg
                    className="w-full h-full transform -rotate-90"
                    viewBox="0 0 80 80"
                  >
                    <circle
                      cx="40"
                      cy="40"
                      r={donutR}
                      strokeWidth="6"
                      className="stroke-white/5"
                      fill="transparent"
                    />
                    {highDash > 0 && (
                      <circle
                        cx="40"
                        cy="40"
                        r={donutR}
                        strokeWidth="6"
                        strokeDasharray={`${highDash} ${donutC - highDash}`}
                        strokeDashoffset={highOffset}
                        stroke="#D4FF2A"
                        fill="transparent"
                        className="transition-all duration-700 ease-out"
                      />
                    )}
                    {medLowDash > 0 && (
                      <circle
                        cx="40"
                        cy="40"
                        r={donutR}
                        strokeWidth="6"
                        strokeDasharray={`${medLowDash} ${donutC - medLowDash}`}
                        strokeDashoffset={medLowOffset}
                        stroke="#2563EB"
                        fill="transparent"
                        className="transition-all duration-700 ease-out"
                      />
                    )}
                    {missingDash > 0 && (
                      <circle
                        cx="40"
                        cy="40"
                        r={donutR}
                        strokeWidth="6"
                        strokeDasharray={`${missingDash} ${
                          donutC - missingDash
                        }`}
                        strokeDashoffset={missingOffset}
                        stroke="#60A5FA"
                        fill="transparent"
                        className="transition-all duration-700 ease-out"
                      />
                    )}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-sm font-black text-white">
                      {totalFindings}
                    </span>
                    <span className="text-[8px] font-mono uppercase text-slate-400 tracking-wider">
                      Items
                    </span>
                  </div>
                </div>

                {/* Clean Legend */}
                <div className="space-y-1.5 text-xs font-mono min-w-0">
                  <div className="flex items-center justify-between gap-4">
                    <span className="flex items-center gap-1.5 text-[#CBD5E1]">
                      <span className="w-2 h-2 rounded-full bg-[#D4FF2A]"></span>
                      High Traps
                    </span>
                    <span className="font-bold text-white">
                      {highTrapsCount}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="flex items-center gap-1.5 text-[#CBD5E1]">
                      <span className="w-2 h-2 rounded-full bg-[#2563EB]"></span>
                      Med/Low Traps
                    </span>
                    <span className="font-bold text-white">
                      {medLowTrapsCount}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="flex items-center gap-1.5 text-[#CBD5E1]">
                      <span className="w-2 h-2 rounded-full bg-[#60A5FA]"></span>
                      Missing Rights
                    </span>
                    <span className="font-bold text-white">
                      {missingRightsCount}
                    </span>
                  </div>
                </div>
              </div>

              {/* Mini Horizontal Fairness vs. Risk Bar */}
              <div className="mt-4 pt-3 border-t border-white/10 w-full">
                <div className="flex items-center justify-between text-[11px] font-mono mb-1.5">
                  <span className="text-[#60A5FA] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB]" />
                    Fairness {100 - displayScore}%
                  </span>
                  <span className="text-[#D4FF2A] flex items-center gap-1">
                    Risk {displayScore}%
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D4FF2A]" />
                  </span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden flex">
                  <div
                    style={{ width: `${100 - displayScore}%` }}
                    className="bg-[#2563EB] h-full transition-all duration-700"
                  />
                  <div
                    style={{ width: `${displayScore}%` }}
                    className="bg-[#D4FF2A] h-full transition-all duration-700 shadow-[0_0_8px_#D4FF2A]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Clean 2-Column Hairline Results: lg:grid-cols-[1.35fr_1fr] gap-10 */}
          <div className="grid grid-cols-1 lg:grid-cols-[1.35fr_1fr] gap-10 items-start">
            {/* Left Column: Flagged Traps + Missing Rights */}
            <div className="space-y-12">
              {/* 01 / FLAGGED TRAPS */}
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-6">
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#60A5FA] flex items-center gap-2">
                    <span>01 /</span> Flagged Traps ({result.flaggedClauses.length})
                  </h3>
                </div>

                <div className="space-y-6">
                  {result.flaggedClauses.map((clause, idx) => {
                    const clauseRisk = getRiskMeta(0, clause.risk);
                    return (
                      <div
                        key={idx}
                        className="border-t border-white/10 pt-5 first:border-0 first:pt-0 space-y-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <h4 className="text-base font-bold text-white tracking-tight">
                            {clause.title}
                          </h4>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono uppercase ${clauseRisk.pill}`}
                          >
                            {clause.risk}
                          </span>
                        </div>

                        {clause.quote && (
                          <p className="text-xs font-mono italic text-[#CBD5E1] pl-3 border-l-2 border-[#60A5FA]/40 py-0.5 leading-relaxed">
                            &ldquo;{clause.quote}&rdquo;
                          </p>
                        )}

                        <div className="space-y-1 text-sm">
                          <p className="text-[#CBD5E1] leading-relaxed">
                            <span className="text-xs font-mono uppercase tracking-wider text-slate-400 mr-2">
                              Why it hurts:
                            </span>
                            {clause.whyItMatters}
                          </p>
                          <p className="text-[#D4FF2A] font-medium leading-relaxed pt-1">
                            <span className="text-xs font-mono uppercase tracking-wider text-[#60A5FA] mr-2">
                              Say this:
                            </span>
                            &ldquo;{clause.negotiationLine}&rdquo;
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 02 / MISSING RIGHTS */}
              {result.missingProtections.length > 0 && (
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-6">
                    <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#60A5FA] flex items-center gap-2">
                      <span>02 /</span> Missing Rights (
                      {result.missingProtections.length})
                    </h3>
                  </div>

                  <div className="space-y-6">
                    {result.missingProtections.map((item, idx) => (
                      <div
                        key={idx}
                        className="border-t border-white/10 pt-5 first:border-0 first:pt-0 space-y-2"
                      >
                        <h4 className="text-base font-bold text-white tracking-tight">
                          {item.title}
                        </h4>
                        <p className="text-sm text-[#CBD5E1] leading-relaxed">
                          <span className="text-xs font-mono uppercase tracking-wider text-slate-400 mr-2">
                            What&apos;s missing:
                          </span>
                          {item.whyItMatters}
                        </p>
                        <p className="text-sm text-[#60A5FA] font-medium leading-relaxed">
                          <span className="text-xs font-mono uppercase tracking-wider text-[#D4FF2A] mr-2">
                            Ask to add:
                          </span>
                          &ldquo;{item.askFor}&rdquo;
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Sticky Pushback Negotiation Email */}
            <div>
              <div className="sticky top-24 rounded-2xl bg-[#0A0F1C] border border-white/10 p-6 backdrop-blur-md shadow-2xl space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#60A5FA] flex items-center gap-2">
                    <span>03 /</span> Negotiation Email
                  </h3>
                  <span className="text-[11px] font-mono text-[#CBD5E1]">
                    Ready-to-send
                  </span>
                </div>

                <div className="space-y-3 font-mono text-xs">
                  <div className="p-3 rounded-xl bg-[#05070C] border border-white/10 text-[#CBD5E1]">
                    <span className="text-slate-500 mr-2">Subject:</span>
                    <span className="text-white font-semibold">
                      {result.negotiationEmail.subject}
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-[#05070C] border border-white/10 text-[#F8FAFC] font-sans text-sm leading-relaxed whitespace-pre-line max-h-[380px] overflow-y-auto">
                    {result.negotiationEmail.body}
                  </div>
                </div>

                {/* Email Action Buttons */}
                <div className="space-y-2.5 pt-1">
                  <button
                    type="button"
                    onClick={handleCopyEmail}
                    className="w-full bg-[#D4FF2A] hover:bg-[#b8e617] text-[#05070C] font-bold text-sm py-3 px-6 rounded-full transition-all duration-200 shadow-[0_0_20px_rgba(212,255,42,0.25)] flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
                  >
                    {copied ? (
                      <span>Copied! ✓</span>
                    ) : (
                      <span>Copy Email →</span>
                    )}
                  </button>

                  <a
                    href={`mailto:?subject=${encodeURIComponent(
                      result.negotiationEmail.subject
                    )}&body=${encodeURIComponent(result.negotiationEmail.body)}`}
                    className="w-full border border-[#60A5FA]/40 hover:border-[#60A5FA] text-[#60A5FA] hover:text-white hover:bg-[#2563EB]/15 font-bold text-sm py-2.5 px-6 rounded-full transition-all duration-200 flex items-center justify-center gap-2 text-center"
                  >
                    <span>Open in Mail App →</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Minimal Footer: max-w-7xl px-6 sm:px-8 lg:px-12 */}
      <footer className="mt-auto py-10 border-t border-white/10 text-center text-xs font-mono text-slate-500">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <p>
            VetoAI • Built with Next.js & Turbopack • Strictly for educational evaluation
          </p>
        </div>
      </footer>
    </div>
  );
}
