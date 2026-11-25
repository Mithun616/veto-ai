"use client";

import React, { useState, useRef, useMemo, useEffect } from "react";
import type { User } from "firebase/auth";
import { Header } from "./components/Header";
import { Hero } from "./components/Hero";
import { HowItWorks } from "./components/HowItWorks";
import { DocumentWorkspace } from "./components/DocumentWorkspace";
import { AnalysisLoading } from "./components/AnalysisLoading";
import { RiskOverview } from "./components/RiskOverview";
import {
  ClauseOverview,
  SeverityFilter,
  getNormalizedSeverity,
  getSeverityRank,
} from "./components/ClauseOverview";
import { ClauseCard } from "./components/ClauseCard";
import { MissingProtectionCard } from "./components/MissingProtectionCard";
import { NegotiationEmailCard } from "./components/NegotiationEmailCard";
import { SavedScansDrawer } from "./components/SavedScansDrawer";
import { Footer } from "./components/Footer";
import { AnalysisResult, InputTab } from "./components/types";
import {
  onAuthChange,
  signInWithGoogle,
  signOutUser,
  saveScanToFirestore,
  getUserScans,
  type SavedScan,
} from "@/lib/firebase";

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
  const [activeFilter, setActiveFilter] = useState<SeverityFilter>("all");
  const [userToggledIds, setUserToggledIds] = useState<Record<string, boolean>>({});

  // Optional Firebase auth & scan history
  const [user, setUser] = useState<User | null>(null);
  const [savedScans, setSavedScans] = useState<SavedScan[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const resultsRef = useRef<HTMLDivElement | null>(null);
  const workspaceRef = useRef<HTMLDivElement | null>(null);

  // Subscribe to Firebase auth changes on mount
  useEffect(() => {
    const unsubscribe = onAuthChange(async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const scans = await getUserScans(currentUser.uid);
          setSavedScans(scans);
        } catch (err) {
          console.warn("[VetoAI] Failed to load scans:", err);
        }
      } else {
        setSavedScans([]);
      }
    });
    return () => unsubscribe();
  }, []);

  // Generate stable identified clauses and sort: High -> Medium -> Low -> Unrated
  const sortedClauses = useMemo(() => {
    if (!result?.flaggedClauses) return [];
    const identified = result.flaggedClauses.map((clause, idx) => ({
      clause,
      id: `clause-${idx}-${clause.title
        .replace(/[^a-zA-Z0-9]/g, "-")
        .toLowerCase()
        .slice(0, 24)}`,
      originalIndex: idx,
      severity: getNormalizedSeverity(clause.risk),
    }));

    // Stable sort preserving original order within each severity group (High -> Medium -> Low -> Unrated)
    return [...identified].sort(
      (a, b) => getSeverityRank(a.severity) - getSeverityRank(b.severity)
    );
  }, [result]);

  // Initially expand only the first High concern. If no High concern, expand the first finding.
  const defaultExpandedId = useMemo(() => {
    if (!sortedClauses.length) return null;
    const firstHigh = sortedClauses.find((c) => c.severity === "High");
    return firstHigh ? firstHigh.id : sortedClauses[0]?.id;
  }, [sortedClauses]);

  // Toggle independent card expansion
  const toggleClause = (id: string) => {
    setUserToggledIds((prev) => {
      const isCurrentlyExpanded =
        prev[id] !== undefined ? prev[id] : id === defaultExpandedId;
      return {
        ...prev,
        [id]: !isCurrentlyExpanded,
      };
    });
  };

  // Filter clauses by active severity filter
  const filteredClauses = useMemo(() => {
    if (activeFilter === "all") return sortedClauses;
    return sortedClauses.filter(
      (c) => c.severity.toLowerCase() === activeFilter
    );
  }, [sortedClauses, activeFilter]);

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
    setUserToggledIds({});
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
      setActiveFilter("all");
      setUserToggledIds({});
      setIsStale(false);

      // If signed in, automatically persist to Firestore scan history
      if (user) {
        const snippet =
          documentText.slice(0, 45).trim() ||
          selectedFile?.name ||
          "Contract Audit";
        saveScanToFirestore(user.uid, {
          title: snippet,
          overallRisk: data.overallRisk,
          riskScore: data.riskScore,
          summary: data.summary,
          analysis: data as AnalysisResult,
        })
          .then(async () => {
            const updated = await getUserScans(user.uid);
            setSavedScans(updated);
          })
          .catch((err) => console.warn("[VetoAI] Failed to save scan:", err));
      }

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
        {/* Semantic Header with Auth & History Controls */}
        <Header
          user={user}
          historyCount={savedScans.length}
          onSignIn={async () => {
            const loggedInUser = await signInWithGoogle();
            if (loggedInUser) {
              setUser(loggedInUser);
              const scans = await getUserScans(loggedInUser.uid);
              setSavedScans(scans);
            }
          }}
          onSignOut={async () => {
            await signOutUser();
            setUser(null);
            setSavedScans([]);
          }}
          onToggleHistory={() => setIsHistoryOpen(true)}
        />

        {/* Collapsible Saved Scans Drawer */}
        <SavedScansDrawer
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
          scans={savedScans}
          onSelectScan={(scan) => {
            setResult(scan.analysis);
            setActiveFilter("all");
            setUserToggledIds({});
            setIsStale(false);
            setIsHistoryOpen(false);
            setTimeout(() => {
              resultsRef.current?.scrollIntoView({ behavior: "smooth" });
            }, 100);
          }}
        />

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
                        key={`protection-${idx}`}
                        id={`protection-${idx}`}
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
