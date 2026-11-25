export type RiskLevel = "Low" | "Medium" | "High";

export interface FlaggedClause {
  title: string;
  quote: string;
  risk: RiskLevel;
  whyItMatters: string;
  negotiationLine: string;
}

export interface MissingProtection {
  title: string;
  whyItMatters: string;
  askFor: string;
}

export interface NegotiationEmail {
  subject: string;
  body: string;
}

export interface AnalysisResult {
  overallRisk: RiskLevel;
  riskScore: number;
  summary: string;
  flaggedClauses: FlaggedClause[];
  missingProtections: MissingProtection[];
  negotiationEmail: NegotiationEmail;
}

export type InputTab = "paste" | "upload";
