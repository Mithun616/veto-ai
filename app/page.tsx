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

const SAMPLE_SAAS = `SAAS & FREELANCE SERVICES MASTER AGREEMENT

1. Intellectual Property & Ownership: Contractor hereby assigns all rights, title, and interest in all intellectual property, code, frameworks, and background tools created before or during this agreement exclusively to Client, with no reservation of pre-existing library rights.
2. Payment & Unilateral Withholding: Invoices are payable net 90 days. Client reserves the right to withhold up to 40% of fees indefinitely if client deems work unsatisfactory at its sole discretion without objective criteria.
3. Indemnification & Unlimited Liability: Contractor agrees to indemnify, defend, and hold harmless Client against any third-party claims without any monetary cap on liability. Client liability to Contractor is capped at $0.
4. Non-Solicitation & Non-Compete: Contractor shall not provide development or design services to any company operating in the SaaS sector globally for 18 months following contract completion.`;

const SCAN_TICKER = [
  "PARSING CLAUSES",
  "HUNTING EXIT TRAPS",
  "AUDITING MISSING RIGHTS",
  "DRAFTING PUSHBACK",
];

const DOC_TYPES = [
  "Auto-Detect",
  "Internship Offer",
  "Rental Agreement",
  "SaaS / Freelance",
] as const;

type DocType = (typeof DOC_TYPES)[number];
type ResultFilter = "all" | "traps" | "rights" | "email";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<"paste" | "upload">("paste");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentText, setDocumentText] = useState("");
  const [docType, setDocType] = useState<DocType>("Auto-Detect");
  const [docTypeOpen, setDocTypeOpen] = useState(false);
  const [resultFilter, setResultFilter] = useState<ResultFilter>("all");
  const [openQuotes, setOpenQuotes] = useState<Record<number, boolean>>({});

  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [displayScore, setDisplayScore] = useState(0);
  const [copied, setCopied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const resultsRef = useRef<HTMLDivElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const characterCount = documentText.length;
  const canScan =
    activeTab === "upload" ? selectedFile !== null : characterCount >= 20;

  // Close docType dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDocTypeOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Stepper timer during loading (cycles through SCAN_TICKER)
  useEffect(() => {
    if (!loading) return;

    const interval = setInterval(() => {
      setActiveStep((prev) => (prev < SCAN_TICKER.length - 1 ? prev + 1 : prev));
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

  const handleSelectDocType = (type: DocType) => {
    setDocType(type);
    setDocTypeOpen(false);

    if (type === "Internship Offer") {
      setActiveTab("paste");
      setDocumentText(SAMPLE_INTERNSHIP);
      setSelectedFile(null);
      setError(null);
    } else if (type === "Rental Agreement") {
      setActiveTab("paste");
      setDocumentText(SAMPLE_RENTAL);
      setSelectedFile(null);
      setError(null);
    } else if (type === "SaaS / Freelance") {
      setActiveTab("paste");
      setDocumentText(SAMPLE_SAAS);
      setSelectedFile(null);
      setError(null);
    }
  };

  const toggleQuote = (idx: number) => {
    setOpenQuotes((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  const handleScan = async () => {
    if (!canScan || loading) return;

    setLoading(true);
    setActiveStep(0);
    setDisplayScore(0);
    setError(null);
    setResult(null);
    setOpenQuotes({});
    setResultFilter("all");

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
        pill: "bg-[#D4FF2A] text-[#05070C] font-bold shadow-[0_0_12px_rgba(212,255,42,0.3)]",
        verdict: "HIGH RISK — DO NOT SIGN AS-IS",
        color: "text-[#D4FF2A]",
        ringColor: "#D4FF2A",
        label: "HIGH",
      };
    }
    if (score >= 35 || riskLevel === "Medium") {
      return {
        pill: "bg-[#2563EB] text-white font-bold shadow-[0_0_12px_rgba(37,99,235,0.3)]",
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
    <div className="min-h-screen bg-[#05070C] text-[#F8FAFC] flex flex-col font-sans selection:bg-[#D4FF2A] selection:text-[#05070C] relative bg-grid-architectural overflow-x-hidden">
      {/* Luminous Ambient Glow Orbs */}
      <div className="absolute top-12 right-0 w-[650px] h-[650px] bg-gradient-to-bl from-[#2563EB]/25 via-[#60A5FA]/12 to-[#D4FF2A]/8 blur-3xl pointer-events-none -z-10 animate-pulse-glow" />
      <div className="absolute top-0 left-0 w-[550px] h-[550px] bg-gradient-to-br from-[#2563EB]/15 to-transparent blur-3xl pointer-events-none -z-10" />

      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-[#05070C]/80 backdrop-blur-2xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* VetoAI Shield Mark */}
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#D4FF2A] via-[#60A5FA] to-[#2563EB] p-[1.5px] shadow-lg shadow-[#D4FF2A]/10 hover:shadow-[#D4FF2A]/25 transition-all">
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
              <span className="w-1.5 h-1.5 rounded-full bg-[#D4FF2A] animate-pulse" />
              EDUCATIONAL REVIEW • NOT LEGAL ADVICE
            </span>
          </div>
        </div>
      </header>

      {/* Asymmetric 2-Column Hero Launchpad */}
      <section className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 pt-10 sm:pt-14 pb-12 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_1.15fr] items-center gap-10 lg:gap-14">
          {/* Left Column: Editorial Pitch */}
          <div className="space-y-6 sm:space-y-7">
            {/* Glowing Pill Badge */}
            <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full text-xs font-mono font-bold tracking-wider uppercase bg-[#D4FF2A]/10 text-[#D4FF2A] border border-[#D4FF2A]/30 shadow-[0_0_18px_rgba(212,255,42,0.18)]">
              <span className="w-2 h-2 rounded-full bg-[#D4FF2A] animate-ping" />
              <span>4-TIER AI X-RAY • ZERO DATA STORED</span>
            </div>

            {/* Oversized Mixed-Font Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.05] text-[#F8FAFC]">
              <span className="font-serif italic font-normal text-[#D4FF2A] mr-3">
                Spot
              </span>
              Every <span className="text-[#60A5FA]">Trap</span> Before You Sign.
            </h1>

            {/* Crisp 1-Line Pitch */}
            <p className="text-base sm:text-lg text-[#CBD5E1] font-normal leading-relaxed max-w-xl">
              Drop any offer letter, lease, or terms. Expose hidden traps and copy your pushback in seconds.
            </p>

            {/* 3-Column Glassy Micro-Metric Strip */}
            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="p-3.5 rounded-xl bg-white/[0.03] backdrop-blur-xl border border-white/10 hover:border-[#D4FF2A]/50 hover:-translate-y-0.5 transition-all shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
                <div className="text-[#60A5FA] text-sm sm:text-base font-bold font-mono">
                  PDF & DOCX
                </div>
                <div className="text-[11px] font-mono text-[#CBD5E1] mt-0.5">
                  Native Extraction
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-white/[0.03] backdrop-blur-xl border border-white/10 hover:border-[#D4FF2A]/50 hover:-translate-y-0.5 transition-all shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
                <div className="text-[#D4FF2A] text-sm sm:text-base font-bold font-mono">
                  Missing Rights
                </div>
                <div className="text-[11px] font-mono text-[#CBD5E1] mt-0.5">
                  Omission Check
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-white/[0.03] backdrop-blur-xl border border-white/10 hover:border-[#D4FF2A]/50 hover:-translate-y-0.5 transition-all shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
                <div className="text-white text-sm sm:text-base font-bold font-mono">
                  1-Click Gmail
                </div>
                <div className="text-[11px] font-mono text-[#CBD5E1] mt-0.5">
                  Pre-filled Draft
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Floating Glass Command Stage */}
          <div className="w-full">
            <div className="rounded-2xl border border-[#60A5FA]/25 bg-white/[0.03] backdrop-blur-2xl p-5 sm:p-7 shadow-[0_0_60px_rgba(37,99,235,0.2)] hover:border-[#60A5FA]/40 transition-all duration-300 relative">
              {loading ? (
                /* Futuristic X-Ray Scanner Animation */
                <div className="space-y-6 py-3 animate-fade-up">
                  {/* Top Ticker + Telemetry Equalizer */}
                  <div className="flex items-center justify-between pb-4 border-b border-white/10">
                    <div className="flex items-center gap-3">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#D4FF2A] animate-ping" />
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-widest text-[#60A5FA]">
                          TELEMETRY STATUS
                        </span>
                        <div className="text-sm font-mono font-bold text-[#D4FF2A] tracking-wider">
                          {SCAN_TICKER[activeStep]}
                        </div>
                      </div>
                    </div>

                    {/* Equalizer Bars */}
                    <div className="flex items-end gap-1 h-6 px-2.5 py-1 bg-[#05070C]/80 rounded-lg border border-white/10">
                      <div className="w-1 bg-[#D4FF2A] rounded-full animate-eq-1" />
                      <div className="w-1 bg-[#60A5FA] rounded-full animate-eq-2" />
                      <div className="w-1 bg-[#D4FF2A] rounded-full animate-eq-3" />
                      <div className="w-1 bg-[#2563EB] rounded-full animate-eq-4" />
                      <div className="w-1 bg-[#D4FF2A] rounded-full animate-eq-5" />
                    </div>
                  </div>

                  {/* Center Radar Pulse + Moving Laser Scanline */}
                  <div className="relative rounded-xl bg-[#05070C]/90 border border-[#60A5FA]/30 p-8 overflow-hidden flex flex-col items-center justify-center min-h-[220px]">
                    {/* Sweeping Laser Scanline */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
                      <div className="absolute left-0 right-0 h-[2.5px] bg-gradient-to-r from-transparent via-[#D4FF2A] to-[#60A5FA] blur-[0.5px] animate-xray-laser shadow-[0_0_15px_#D4FF2A]" />
                    </div>

                    {/* Concentric Radar Pulse Rings */}
                    <div className="relative w-36 h-36 flex items-center justify-center z-0">
                      <div className="absolute inset-0 rounded-full border border-[#2563EB]/40 animate-radar-pulse" />
                      <div className="absolute w-24 h-24 rounded-full border border-[#60A5FA]/30 animate-ping opacity-25" />
                      <div className="absolute w-14 h-14 rounded-full bg-[#2563EB]/20 border border-[#D4FF2A]/50 flex items-center justify-center shadow-[0_0_20px_rgba(212,255,42,0.2)]">
                        <svg
                          className="w-6 h-6 text-[#D4FF2A]"
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

                    {/* Shimmer Placeholder Document Bars */}
                    <div className="w-full max-w-xs space-y-2 mt-5 z-0">
                      <div className="h-2 rounded-full bg-white/10 w-3/4 mx-auto animate-pulse" />
                      <div className="h-2 rounded-full bg-white/15 w-full mx-auto animate-pulse" />
                      <div className="h-2 rounded-full bg-white/10 w-5/6 mx-auto animate-pulse" />
                    </div>
                  </div>

                  {/* Scanner Step Indicator */}
                  <div className="grid grid-cols-4 gap-2 pt-1 font-mono text-[10px]">
                    {SCAN_TICKER.map((step, idx) => {
                      const isDone = idx < activeStep;
                      const isCurrent = idx === activeStep;
                      return (
                        <div
                          key={idx}
                          className={`px-2 py-1.5 rounded-lg border text-center transition-all ${
                            isCurrent
                              ? "bg-[#2563EB]/20 border-[#60A5FA] text-[#D4FF2A] font-bold shadow-[0_0_10px_rgba(37,99,235,0.3)]"
                              : isDone
                              ? "bg-[#05070C] border-[#D4FF2A]/30 text-[#D4FF2A]"
                              : "bg-[#05070C]/40 border-white/5 text-slate-500"
                          }`}
                        >
                          <span>{isDone ? "✓" : `0${idx + 1}`}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* Interactive Input Command Stage */
                <>
                  {/* Top Bar: Segmented Tab Switch + Preset Dropdown */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
                    {/* Segmented Tab Switch */}
                    <div className="inline-flex p-1 rounded-xl bg-[#05070C]/90 border border-white/10 self-start shadow-inner">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab("paste");
                          setError(null);
                        }}
                        className={`px-4 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all ${
                          activeTab === "paste"
                            ? "bg-[#2563EB] text-white shadow-md shadow-[#2563EB]/25"
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
                            ? "bg-[#2563EB] text-white shadow-md shadow-[#2563EB]/25"
                            : "text-[#CBD5E1] hover:text-white"
                        }`}
                      >
                        Upload PDF / DOCX
                      </button>
                    </div>

                    {/* Interactive Document Type Preset Dropdown */}
                    <div className="flex items-center gap-2" ref={dropdownRef}>
                      <span className="text-slate-500 text-[11px] font-mono uppercase tracking-wider hidden sm:inline">
                        Preset:
                      </span>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setDocTypeOpen((prev) => !prev)}
                          className="px-3.5 py-1.5 rounded-xl bg-[#05070C]/90 border border-white/10 hover:border-[#60A5FA]/50 text-xs font-mono font-semibold text-[#60A5FA] hover:text-white transition-all flex items-center gap-2 shadow-sm"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-[#60A5FA]" />
                          <span>{docType}</span>
                          <svg
                            className={`w-3.5 h-3.5 transition-transform duration-200 ${
                              docTypeOpen ? "rotate-180" : ""
                            }`}
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                          >
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </button>

                        {docTypeOpen && (
                          <div className="absolute right-0 mt-2 w-48 rounded-xl bg-[#0A0F1C]/95 backdrop-blur-2xl border border-white/10 p-1.5 shadow-2xl z-30 animate-fade-up">
                            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 px-3 py-1.5">
                              Select Contract Type
                            </div>
                            {DOC_TYPES.map((type) => (
                              <button
                                key={type}
                                type="button"
                                onClick={() => handleSelectDocType(type)}
                                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-mono transition-all flex items-center justify-between ${
                                  docType === type
                                    ? "bg-[#2563EB] text-white font-semibold"
                                    : "text-[#CBD5E1] hover:text-white hover:bg-white/5"
                                }`}
                              >
                                <span>{type}</span>
                                {docType === type && (
                                  <span className="text-xs">✓</span>
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Tab Content */}
                  <div className="py-4">
                    {activeTab === "paste" ? (
                      <textarea
                        value={documentText}
                        onChange={(e) => setDocumentText(e.target.value)}
                        rows={6}
                        placeholder="Paste offer letter, rental agreement, or contract clause here... (min. 20 characters)"
                        className="w-full bg-[#05070C]/70 text-[#F8FAFC] placeholder-slate-500 border border-white/10 rounded-xl p-4 text-[15px] font-mono leading-relaxed focus:outline-none focus:border-[#60A5FA] focus:ring-1 focus:ring-[#60A5FA]/30 transition-all resize-y min-h-[170px]"
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
                            className={`rounded-xl border border-dashed p-7 text-center cursor-pointer transition-all ${
                              isDragging
                                ? "border-[#D4FF2A] bg-[#D4FF2A]/5 scale-[1.01]"
                                : "border-white/15 hover:border-[#60A5FA]/60 bg-[#05070C]/60 hover:bg-[#05070C]/90"
                            }`}
                          >
                            <div className="flex flex-col items-center justify-center gap-3">
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
                    <div className="mb-4 p-3 rounded-xl bg-[#2563EB]/10 border border-[#60A5FA]/40 text-sm text-[#F8FAFC] flex items-center gap-2.5 font-mono">
                      <span className="text-[#60A5FA] font-bold">!</span>
                      <span>{error}</span>
                    </div>
                  )}

                  {/* Bottom Bar: Character Status + Run Button */}
                  <div className="flex items-center justify-between pt-4 border-t border-white/10">
                    <div className="text-xs font-mono text-[#CBD5E1]">
                      {activeTab === "paste" ? (
                        <span>
                          <strong className="text-white font-semibold">
                            {characterCount}
                          </strong>{" "}
                          chars
                          {characterCount < 20 && (
                            <span className="text-slate-500 ml-1.5">
                              (min 20)
                            </span>
                          )}
                        </span>
                      ) : (
                        <span>
                          {selectedFile ? (
                            <span className="text-[#D4FF2A] font-semibold">
                              Ready to scan
                            </span>
                          ) : (
                            <span className="text-slate-500">
                              No file selected
                            </span>
                          )}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={handleScan}
                      disabled={!canScan || loading}
                      className="bg-[#D4FF2A] hover:bg-[#b8e617] text-[#05070C] font-bold text-sm px-7 py-2.5 rounded-full transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(212,255,42,0.25)] hover:shadow-[0_0_28px_rgba(212,255,42,0.4)] flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
                    >
                      Run X-Ray Scan →
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Minimal, Ultra-Readable Results: max-w-7xl px-6 sm:px-8 lg:px-12 */}
      {result && !loading && (
        <section
          ref={resultsRef}
          className="w-full max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 mt-4 mb-20 space-y-8 animate-fade-up"
        >
          {/* Top Executive Verdict Banner (Frosted Glass 3-Part Bar) */}
          <div className="p-7 sm:p-8 rounded-2xl bg-white/[0.03] backdrop-blur-2xl border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.6)] hover:border-[#60A5FA]/40 hover:shadow-[0_12px_40px_rgba(37,99,235,0.18)] transition-all duration-300 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
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

          {/* Interactive Result Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-white/10">
            <button
              type="button"
              onClick={() => setResultFilter("all")}
              className={`px-4 py-2 rounded-xl text-xs font-mono font-semibold transition-all whitespace-nowrap flex items-center gap-2 ${
                resultFilter === "all"
                  ? "bg-[#2563EB] text-white shadow-lg shadow-[#2563EB]/25"
                  : "bg-white/[0.03] text-[#CBD5E1] hover:text-white hover:bg-white/[0.06] border border-white/5"
              }`}
            >
              <span>All Findings</span>
              <span className="px-1.5 py-0.2 rounded-full bg-white/15 text-[10px]">
                {totalFindings}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setResultFilter("traps")}
              className={`px-4 py-2 rounded-xl text-xs font-mono font-semibold transition-all whitespace-nowrap flex items-center gap-2 ${
                resultFilter === "traps"
                  ? "bg-[#2563EB] text-white shadow-lg shadow-[#2563EB]/25"
                  : "bg-white/[0.03] text-[#CBD5E1] hover:text-white hover:bg-white/[0.06] border border-white/5"
              }`}
            >
              <span>Flagged Traps</span>
              <span className="px-1.5 py-0.2 rounded-full bg-[#D4FF2A]/20 text-[#D4FF2A] text-[10px] font-bold">
                {result.flaggedClauses.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setResultFilter("rights")}
              className={`px-4 py-2 rounded-xl text-xs font-mono font-semibold transition-all whitespace-nowrap flex items-center gap-2 ${
                resultFilter === "rights"
                  ? "bg-[#2563EB] text-white shadow-lg shadow-[#2563EB]/25"
                  : "bg-white/[0.03] text-[#CBD5E1] hover:text-white hover:bg-white/[0.06] border border-white/5"
              }`}
            >
              <span>Missing Rights</span>
              <span className="px-1.5 py-0.2 rounded-full bg-[#60A5FA]/20 text-[#60A5FA] text-[10px]">
                {result.missingProtections.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setResultFilter("email")}
              className={`px-4 py-2 rounded-xl text-xs font-mono font-semibold transition-all whitespace-nowrap flex items-center gap-2 ${
                resultFilter === "email"
                  ? "bg-[#2563EB] text-white shadow-lg shadow-[#2563EB]/25"
                  : "bg-white/[0.03] text-[#CBD5E1] hover:text-white hover:bg-white/[0.06] border border-white/5"
              }`}
            >
              <span>Negotiation Email</span>
              <span className="px-1.5 py-0.2 rounded-full bg-white/10 text-[10px]">
                Ready
              </span>
            </button>
          </div>

          {/* Clean 2-Column Hairline Results */}
          <div
            className={`grid grid-cols-1 ${
              resultFilter === "all"
                ? "lg:grid-cols-[1.35fr_1fr]"
                : "lg:grid-cols-1"
            } gap-10 items-start`}
          >
            {/* Left Column: Flagged Traps + Missing Rights */}
            {(resultFilter === "all" ||
              resultFilter === "traps" ||
              resultFilter === "rights") && (
              <div className="space-y-10">
                {/* 01 / FLAGGED TRAPS */}
                {(resultFilter === "all" || resultFilter === "traps") && (
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-6">
                      <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#60A5FA] flex items-center gap-2">
                        <span>01 /</span> Flagged Traps (
                        {result.flaggedClauses.length})
                      </h3>
                    </div>

                    <div className="space-y-4">
                      {result.flaggedClauses.map((clause, idx) => {
                        const clauseRisk = getRiskMeta(0, clause.risk);
                        const isQuoteOpen = openQuotes[idx] || false;
                        return (
                          <div
                            key={idx}
                            className="p-5 rounded-2xl bg-white/[0.03] backdrop-blur-2xl border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.5)] hover:-translate-y-0.5 hover:border-[#60A5FA]/40 hover:shadow-[0_10px_35px_rgba(37,99,235,0.15)] transition-all duration-300 space-y-3.5"
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

                            {/* Why it hurts */}
                            <p className="text-sm text-[#F8FAFC] leading-relaxed">
                              <span className="text-xs font-mono uppercase tracking-wider text-slate-400 mr-2">
                                Why it hurts:
                              </span>
                              {clause.whyItMatters}
                            </p>

                            {/* Say this */}
                            <p className="text-sm text-[#D4FF2A] font-medium leading-relaxed">
                              <span className="text-xs font-mono uppercase tracking-wider text-[#60A5FA] mr-2">
                                Say this:
                              </span>
                              &ldquo;{clause.negotiationLine}&rdquo;
                            </p>

                            {/* Collapsible View Exact Quote Accordion */}
                            {clause.quote && (
                              <div className="pt-1 border-t border-white/5">
                                <button
                                  type="button"
                                  onClick={() => toggleQuote(idx)}
                                  className="text-xs font-mono text-[#60A5FA] hover:text-[#D4FF2A] transition-colors flex items-center gap-1.5 py-1"
                                >
                                  <span>
                                    {isQuoteOpen
                                      ? "Hide Contract Quote"
                                      : "View Exact Quote"}
                                  </span>
                                  <svg
                                    className={`w-3.5 h-3.5 transition-transform duration-200 transform ${
                                      isQuoteOpen ? "rotate-180" : ""
                                    }`}
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                  >
                                    <polyline points="6 9 12 15 18 9" />
                                  </svg>
                                </button>

                                {isQuoteOpen && (
                                  <div className="mt-2 pl-3.5 py-2.5 pr-3 border-l-2 border-[#60A5FA]/60 bg-[#05070C]/60 rounded-r-xl text-xs font-mono italic text-[#CBD5E1] leading-relaxed animate-fade-up">
                                    &ldquo;{clause.quote}&rdquo;
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 02 / MISSING RIGHTS */}
                {(resultFilter === "all" || resultFilter === "rights") &&
                  result.missingProtections.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-6">
                        <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#60A5FA] flex items-center gap-2">
                          <span>02 /</span> Missing Rights (
                          {result.missingProtections.length})
                        </h3>
                      </div>

                      <div className="space-y-4">
                        {result.missingProtections.map((item, idx) => (
                          <div
                            key={idx}
                            className="p-5 rounded-2xl bg-white/[0.03] backdrop-blur-2xl border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.5)] hover:-translate-y-0.5 hover:border-[#60A5FA]/40 hover:shadow-[0_10px_35px_rgba(37,99,235,0.15)] transition-all duration-300 space-y-2.5"
                          >
                            <h4 className="text-base font-bold text-white tracking-tight">
                              {item.title}
                            </h4>
                            <p className="text-sm text-[#F8FAFC] leading-relaxed">
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
            )}

            {/* Right Column: Sticky Pushback Negotiation Email */}
            {(resultFilter === "all" || resultFilter === "email") && (
              <div
                className={
                  resultFilter === "email" ? "max-w-2xl mx-auto w-full" : ""
                }
              >
                <div className="sticky top-24 rounded-2xl bg-white/[0.03] backdrop-blur-2xl border border-white/10 p-6 shadow-[0_12px_40px_rgba(0,0,0,0.6)] hover:border-[#60A5FA]/40 hover:shadow-[0_12px_40px_rgba(37,99,235,0.18)] transition-all duration-300 space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#60A5FA] flex items-center gap-2">
                      <span>03 /</span> Negotiation Email
                    </h3>
                    <span className="text-[11px] font-mono text-[#CBD5E1]">
                      Ready-to-send
                    </span>
                  </div>

                  <div className="space-y-3 font-mono text-xs">
                    <div className="p-3.5 rounded-xl bg-[#05070C]/80 border border-white/10 text-[#CBD5E1]">
                      <span className="text-slate-500 mr-2">Subject:</span>
                      <span className="text-white font-semibold">
                        {result.negotiationEmail.subject}
                      </span>
                    </div>

                    <div className="p-4 rounded-xl bg-[#05070C]/80 border border-white/10 text-[#F8FAFC] font-sans text-sm leading-relaxed whitespace-pre-line max-h-[380px] overflow-y-auto">
                      {result.negotiationEmail.body}
                    </div>
                  </div>

                  {/* Email Action Buttons */}
                  <div className="space-y-2.5 pt-1">
                    <button
                      type="button"
                      onClick={handleCopyEmail}
                      className="w-full bg-[#D4FF2A] hover:bg-[#b8e617] text-[#05070C] font-bold text-sm py-3 px-6 rounded-full transition-all duration-200 shadow-[0_0_20px_rgba(212,255,42,0.25)] hover:shadow-[0_0_28px_rgba(212,255,42,0.4)] flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
                    >
                      {copied ? (
                        <span>Copied! ✓</span>
                      ) : (
                        <span>Copy Email →</span>
                      )}
                    </button>

                    <a
                      href={`https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(
                        result.negotiationEmail.subject
                      )}&body=${encodeURIComponent(
                        result.negotiationEmail.body
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full border border-[#60A5FA]/40 hover:border-[#60A5FA] text-[#60A5FA] hover:text-white hover:bg-[#2563EB]/15 font-bold text-sm py-2.5 px-6 rounded-full transition-all duration-200 flex items-center justify-center gap-2 text-center shadow-sm"
                    >
                      <span>Open in Gmail →</span>
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Minimal Footer */}
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
