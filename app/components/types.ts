/**
 * @fileoverview Re-export shared types from core lib for frontend UI components.
 */

export type {
  RiskLevel,
  FlaggedClause,
  MissingProtection,
  NegotiationEmail,
  AnalysisResult,
} from "@/lib/veto";

export type InputTab = "paste" | "upload";
