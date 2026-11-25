/**
 * @fileoverview Shared data types, severity levels, and category definitions
 * for VetoAI contract analysis and negotiation drafting.
 */

/**
 * Severity tier for detected contract risks.
 */
export type RiskLevel = "Low" | "Medium" | "High";

/**
 * Normalized severity tiers for consistent UI indicators, sorting, and filtering.
 */
export type NormalizedSeverity = "High" | "Medium" | "Low" | "Unrated";

/**
 * Detected contract category for context-aware risk analysis and tailored protections.
 */
export type DocumentCategory =
  | "rental"
  | "internship"
  | "saas_fintech"
  | "general";

/**
 * A flagged clause containing a direct quote, danger explanation, and pushback line.
 * Carries its own stable ID so it acts as one coherent object across sorting and filtering.
 */
export interface FlaggedClause {
  id: string;
  title: string;
  quote: string;
  risk: RiskLevel;
  whyItMatters: string;
  negotiationLine: string;
}

/**
 * A critical legal or fairness protection absent from the analyzed text.
 * Carries its own stable ID for consistent referencing.
 */
export interface MissingProtection {
  id: string;
  title: string;
  whyItMatters: string;
  askFor: string;
}

/**
 * Diplomatic counter-proposal draft for negotiation.
 */
export interface NegotiationEmail {
  subject: string;
  body: string;
}

/**
 * Complete structured analysis returned by VetoAI.
 */
export interface AnalysisResult {
  id?: string;
  overallRisk: RiskLevel;
  riskScore: number;
  summary: string;
  flaggedClauses: FlaggedClause[];
  missingProtections: MissingProtection[];
  negotiationEmail: NegotiationEmail;
  unverifiedCount?: number;
  hasSupportedFindings?: boolean;
  reviewStatus?: "complete" | "incomplete_unverified" | "clean";
}

/**
 * Raw unchecked shapes encountered during LLM JSON deserialization.
 */
export interface RawFlaggedClause {
  id?: unknown;
  title?: unknown;
  quote?: unknown;
  risk?: unknown;
  whyItMatters?: unknown;
  negotiationLine?: unknown;
}

export interface RawMissingProtection {
  id?: unknown;
  title?: unknown;
  whyItMatters?: unknown;
  askFor?: unknown;
}

export interface RawNegotiationEmail {
  subject?: unknown;
  body?: unknown;
}

export interface RawAnalysisData {
  overallRisk?: unknown;
  riskScore?: unknown;
  summary?: unknown;
  flaggedClauses?: unknown;
  missingProtections?: unknown;
  negotiationEmail?: unknown;
}

/**
 * Normalizes any raw risk string into standard severity tiers.
 * Missing, undefined, or unrecognized values return "Unrated" without silently coercing to Low.
 *
 * @param risk - Raw risk string from model or input.
 * @returns Normalized severity: "High" | "Medium" | "Low" | "Unrated".
 */
export function getNormalizedSeverity(risk: unknown): NormalizedSeverity {
  if (typeof risk !== "string") return "Unrated";
  const r = risk.trim().toLowerCase();
  if (r === "high") return "High";
  if (r === "medium" || r === "moderate") return "Medium";
  if (r === "low") return "Low";
  return "Unrated";
}

/**
 * Returns numeric priority rank for sorting: High (1) -> Medium (2) -> Low (3) -> Unrated (4).
 *
 * @param s - Normalized severity value.
 * @returns Sort priority integer (1 to 4).
 */
export function getSeverityRank(s: NormalizedSeverity): number {
  switch (s) {
    case "High":
      return 1;
    case "Medium":
      return 2;
    case "Low":
      return 3;
    case "Unrated":
    default:
      return 4;
  }
}
