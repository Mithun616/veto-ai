"use client";

import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import type { User } from "firebase/auth";
import type { AnalysisResult, InputTab, FlaggedClause } from "@/app/components/types";
import {
  type SeverityFilter,
  type NormalizedSeverity,
  getNormalizedSeverity,
  getSeverityRank,
} from "@/app/components/ClauseOverview";
import {
  onAuthChange,
  signInWithGoogle,
  signOutUser,
  saveScanToFirestore,
  getUserScans,
  type SavedScan,
} from "@/lib/firebase";
import { SAMPLE_INTERNSHIP, SAMPLE_RENTAL, type SampleType } from "@/lib/samples";

/**
 * Decorated clause with unique identifier and computed severity.
 */
export interface IdentifiedClause {
  clause: FlaggedClause;
  id: string;
  originalIndex: number;
  severity: NormalizedSeverity;
}

/**
 * Hook options for controlling UI side effects like scrolling.
 */
export interface UseVetoSessionOptions {
  onScrollToWorkspace?: () => void;
  onScrollToResults?: () => void;
}

/**
 * Custom hook encapsulating contract analysis session lifecycle, file uploads,
 * text editing, request cancellation, Firestore scan history, and clause filtering.
 *
 * @param options - Optional scroll callbacks for workspace and results focus.
 * @returns Comprehensive session state, memoized derived values, and action handlers.
 */
export function useVetoSession(options: UseVetoSessionOptions = {}) {
  const { onScrollToWorkspace, onScrollToResults } = options;

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

  const abortControllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

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
  const sortedClauses = useMemo<IdentifiedClause[]>(() => {
    if (!result?.flaggedClauses) return [];
    const identified: IdentifiedClause[] = result.flaggedClauses.map((clause, idx) => ({
      clause,
      id: clause.id || `clause-${idx + 1}`,
      originalIndex: idx,
      severity: getNormalizedSeverity(clause.risk),
    }));

    // Stable sort preserving original order within each severity group (High -> Medium -> Low -> Unrated)
    return [...identified].sort(
      (a, b) => getSeverityRank(a.severity) - getSeverityRank(b.severity)
    );
  }, [result]);

  // Initially expand only the first High concern. If no High concern, expand the first finding.
  const defaultExpandedId = useMemo<string | null>(() => {
    if (!sortedClauses.length) return null;
    const firstHigh = sortedClauses.find((c) => c.severity === "High");
    return firstHigh ? firstHigh.id : sortedClauses[0]?.id;
  }, [sortedClauses]);

  // Toggle independent card expansion
  const toggleClause = useCallback((id: string) => {
    setUserToggledIds((prev) => {
      const isCurrentlyExpanded =
        prev[id] !== undefined ? prev[id] : id === defaultExpandedId;
      return {
        ...prev,
        [id]: !isCurrentlyExpanded,
      };
    });
  }, [defaultExpandedId]);

  // Filter clauses by active severity filter
  const filteredClauses = useMemo(() => {
    if (activeFilter === "all") return sortedClauses;
    return sortedClauses.filter(
      (c) => c.severity.toLowerCase() === activeFilter
    );
  }, [sortedClauses, activeFilter]);

  // Smooth scroll to results helper
  const scrollToResultsView = useCallback(() => {
    if (onScrollToResults) {
      onScrollToResults();
    } else {
      setTimeout(() => {
        document.getElementById("results-section")?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [onScrollToResults]);

  // Try a sample (populates text, switches tab, clears previous results & cancels in-flight requests)
  const handleLoadSample = useCallback((type: SampleType) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const sampleText = type === "internship" ? SAMPLE_INTERNSHIP : SAMPLE_RENTAL;
    setActiveTab("paste");
    setDocumentText(sampleText);
    setSelectedFile(null);
    setError(null);
    setResult(null);
    setIsStale(false);
    setUserToggledIds({});

    if (onScrollToWorkspace) {
      onScrollToWorkspace();
    }
  }, [onScrollToWorkspace]);

  // Text change handler with stale tracking
  const handleTextChange = useCallback((text: string) => {
    setDocumentText(text);
    if (result) {
      setIsStale(true);
    }
    if (error) setError(null);
  }, [result, error]);

  // File select handler with validation & stale tracking
  const handleFileSelect = useCallback((file: File) => {
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
  }, [result]);

  const handleFileRemove = useCallback(() => {
    setSelectedFile(null);
    if (result) {
      setIsStale(true);
    }
  }, [result]);

  const handleClear = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setDocumentText("");
    setSelectedFile(null);
    setError(null);
    setResult(null);
    setIsStale(false);
    setUserToggledIds({});
  }, []);

  // Submit for analysis with request cancellation & race condition handling
  const handleSubmit = useCallback(async () => {
    if (loading) return;

    if (activeTab === "paste" && documentText.trim().length < 20) {
      setError("Please enter at least 20 characters of document text.");
      return;
    }

    if (activeTab === "upload" && !selectedFile) {
      setError("Please select a document file (.pdf, .docx, or .txt).");
      return;
    }

    // Cancel any previous in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const currentRequestId = ++requestIdRef.current;

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
          signal: controller.signal,
        });
      } else {
        response = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ documentText }),
          signal: controller.signal,
        });
      }

      const data = await response.json();

      // Ignore responses from superseded requests
      if (currentRequestId !== requestIdRef.current) {
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || "Analysis failed. Please try again.");
      }

      setResult(data as AnalysisResult);
      setActiveFilter("all");
      setUserToggledIds({});
      setIsStale(false);

      // If signed in, automatically persist to Firestore scan history (non-blocking)
      if (user) {
        const snippet =
          documentText.slice(0, 45).trim() ||
          selectedFile?.name ||
          "Contract Audit";
        saveScanToFirestore(
          user.uid,
          {
            title: snippet,
            overallRisk: data.overallRisk,
            riskScore: data.riskScore,
            summary: data.summary,
            analysis: data as AnalysisResult,
          },
          (refreshedScans) => {
            setSavedScans(refreshedScans);
          }
        )
          .then(async (docId) => {
            if (docId) {
              const updated = await getUserScans(user.uid);
              setSavedScans(updated);
            }
          })
          .catch((err) => {
            console.warn("[VetoAI] Non-blocking scan history save failed:", err);
          });
      }

      // Smooth scroll to results
      scrollToResultsView();
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      if (currentRequestId !== requestIdRef.current) {
        return;
      }
      const message =
        err instanceof Error
          ? err.message
          : "Unable to complete analysis. Please try again in a few moments.";
      setError(message);
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [loading, activeTab, documentText, selectedFile, user, scrollToResultsView]);

  const handleSignIn = useCallback(async () => {
    const loggedInUser = await signInWithGoogle();
    if (loggedInUser) {
      setUser(loggedInUser);
      const scans = await getUserScans(loggedInUser.uid);
      setSavedScans(scans);
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    await signOutUser();
    setUser(null);
    setSavedScans([]);
  }, []);

  const handleSelectScan = useCallback((scan: SavedScan) => {
    setResult(scan.analysis);
    setActiveFilter("all");
    setUserToggledIds({});
    setIsStale(false);
    setIsHistoryOpen(false);
    scrollToResultsView();
  }, [scrollToResultsView]);

  return {
    // State
    activeTab,
    documentText,
    selectedFile,
    loading,
    error,
    result,
    isStale,
    activeFilter,
    userToggledIds,
    user,
    savedScans,
    isHistoryOpen,

    // Derived
    sortedClauses,
    defaultExpandedId,
    filteredClauses,

    // Actions & Handlers
    setActiveTab,
    setActiveFilter,
    setIsHistoryOpen,
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
  };
}
