/**
 * @fileoverview Core business logic, validation rules, deterministic clause analyzer,
 * and shared data types for VetoAI document risk audits.
 */

/**
 * Severity tier for detected contract risks.
 */
export type RiskLevel = "Low" | "Medium" | "High";

/**
 * A flagged clause containing a direct quote, danger explanation, and pushback line.
 */
export interface FlaggedClause {
  title: string;
  quote: string;
  risk: RiskLevel;
  whyItMatters: string;
  negotiationLine: string;
}

/**
 * A critical legal or fairness protection absent from the analyzed text.
 */
export interface MissingProtection {
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
  overallRisk: RiskLevel;
  riskScore: number;
  summary: string;
  flaggedClauses: FlaggedClause[];
  missingProtections: MissingProtection[];
  negotiationEmail: NegotiationEmail;
}

/**
 * Raw unchecked shapes encountered during LLM JSON deserialization.
 */
export interface RawFlaggedClause {
  title?: unknown;
  quote?: unknown;
  risk?: unknown;
  whyItMatters?: unknown;
  negotiationLine?: unknown;
}

export interface RawMissingProtection {
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

// ---------------------------------------------------------------------------
// Security & Validation Constants
// ---------------------------------------------------------------------------

/** Maximum permissible file upload size in bytes (4 MB). */
export const MAX_FILE_SIZE = 4 * 1024 * 1024;

/** Minimum document characters required for a meaningful analysis. */
export const MIN_DOCUMENT_LENGTH = 20;

/** Maximum document characters processed per request to prevent resource exhaustion (15k chars). */
export const MAX_DOCUMENT_LENGTH = 15000;

/** Allowed file extensions for document ingestion. */
export const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".txt"] as const;

/** Allowed MIME types matching acceptable document types. */
export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "application/octet-stream", // Many browsers send octet-stream for .docx or .txt
] as const;

/**
 * Base system prompt defining the AI review criteria and JSON schema.
 */
export const BASE_SYSTEM_PROMPT = `You are VetoAI, an ultra-minimal, plain-English contract risk reviewer built for students, freshers, tenants, and consumers.
Your explanations must be ultra-concise (1–2 short sentences max per item), punchy, and 100% free of legal jargon. Anyone must be able to read and understand each finding in 3 seconds.

Focus on common traps and unfair terms:
1. Training bonds, financial exit penalties, 50% salary/stipend withholding, 90-day vs 0-day notice traps.
2. Broad IP assignment grabbing personal weekend side projects.
3. Unfair rental deposit cuts (mandatory painting fee), long refund delays (90+ days), 7-day eviction, disclaiming repairs.
4. Hidden consumer lock-ins, auto-renewals, unilateral price hikes.
5. Missing protections (explicit 14-day deposit return timeline, mutual notice, landlord maintenance duties).

Provide your evaluation strictly formatted as JSON:
- overallRisk: "Low" | "Medium" | "High"
- riskScore: integer from 0 to 100 (0 = fair/standard, 100 = highly predatory)
- summary: Exactly 1–2 short sentences in everyday English summarizing the main danger or fairness level.
- flaggedClauses: Array of unfair traps found. For each:
    * title: Short 3-6 word label (e.g., "₹2L Exit Bond Penalty", "Claims Personal Weekend Code")
    * quote: Short snippet from the text (1–2 sentences)
    * risk: "Low" | "Medium" | "High"
    * whyItMatters: 1–2 short, plain-English sentences on why this hurts you (Zero legal jargon).
    * negotiationLine: Exactly 1 short, confident sentence you can say or write to push back.
- missingProtections: Array of omitted safeguards. For each:
    * title: Short 3-5 word name of missing protection (e.g., "14-Day Deposit Refund", "30-Day Notice for Landlord")
    * whyItMatters: Exactly 1 short sentence on what could go wrong without it.
    * askFor: Exactly 1 short sentence asking to add this clause.
- negotiationEmail:
    * subject: Short professional subject line
    * body: Clean, polite 3-paragraph email politely pointing out the flagged points and asking for standard mutual terms.

Always maintain an empowering, ultra-concise, and objective tone. Reply ONLY with a valid JSON object.`;

// ---------------------------------------------------------------------------
// Validation Helpers
// ---------------------------------------------------------------------------

/**
 * Validates document text against safe length bounds.
 *
 * @param input - The raw input to validate.
 * @returns An object indicating validity, safe text, or error message.
 */
export function validateDocumentText(input: unknown): {
  valid: boolean;
  error?: string;
  text: string;
} {
  if (typeof input !== "string") {
    return {
      valid: false,
      error: "Document text must be a valid string.",
      text: "",
    };
  }

  const trimmed = input.trim();

  if (trimmed.length < MIN_DOCUMENT_LENGTH) {
    return {
      valid: false,
      error: `The document must contain at least ${MIN_DOCUMENT_LENGTH} characters to perform analysis (received ${trimmed.length}).`,
      text: trimmed,
    };
  }

  if (trimmed.length > MAX_DOCUMENT_LENGTH) {
    return {
      valid: false,
      error: `Document text exceeds the maximum safe limit of ${MAX_DOCUMENT_LENGTH.toLocaleString()} characters (received ${trimmed.length.toLocaleString()}). Please submit a shorter excerpt or clause list.`,
      text: trimmed.slice(0, MAX_DOCUMENT_LENGTH),
    };
  }

  return {
    valid: true,
    text: trimmed,
  };
}

/**
 * Validates uploaded file metadata (file size, extension, MIME type).
 *
 * @param filename - Name of the file with extension.
 * @param size - File size in bytes.
 * @param mimeType - Optional MIME type reported by the client.
 * @returns Object indicating validity or an explanatory error.
 */
export function validateFileMetadata(
  filename: string,
  size: number,
  mimeType?: string
): { valid: boolean; error?: string } {
  if (size <= 0) {
    return { valid: false, error: "The uploaded file is empty." };
  }

  if (size > MAX_FILE_SIZE) {
    const sizeMb = (size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File size (${sizeMb} MB) exceeds the 4 MB limit.`,
    };
  }

  const lowerName = filename.toLowerCase();
  const hasValidExt = ALLOWED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));

  if (!hasValidExt) {
    return {
      valid: false,
      error:
        "Unsupported file extension. Please upload a .pdf, .docx, or .txt document.",
    };
  }

  if (mimeType && mimeType.trim() !== "") {
    const isAllowedMime =
      ALLOWED_MIME_TYPES.includes(
        mimeType as (typeof ALLOWED_MIME_TYPES)[number]
      ) || mimeType.startsWith("text/");

    if (!isAllowedMime) {
      return {
        valid: false,
        error: `Unsupported file type (${mimeType}). Please upload a valid .pdf, .docx, or .txt document.`,
      };
    }
  }

  return { valid: true };
}

/**
 * Extracts a JSON object from raw LLM output, stripping markdown code blocks or delimiters.
 *
 * @param raw - The raw text received from the model.
 * @returns Deserialized unknown JSON data.
 * @throws Error if no valid JSON object can be extracted.
 */
export function extractJsonObject(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    const codeBlockCleaned = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    try {
      return JSON.parse(codeBlockCleaned);
    } catch {
      const firstBrace = raw.indexOf("{");
      const lastBrace = raw.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        const sliced = raw.substring(firstBrace, lastBrace + 1);
        return JSON.parse(sliced);
      }
      throw new Error("No valid JSON object found in model output.");
    }
  }
}

// ---------------------------------------------------------------------------
// Local Deterministic Clause-Pattern Analyzer
// ---------------------------------------------------------------------------

/**
 * Finds the first sentence in text matching one of the target regex patterns.
 *
 * @param text - Source document text.
 * @param patterns - Array of regexes to test against each sentence.
 * @returns Truncated matching snippet or empty string.
 */
export function findMatchingSnippet(text: string, patterns: RegExp[]): string {
  const sentences = text
    .split(/(?<=[.!?\n])\s+/)
    .map((s) => s.trim().replace(/^["'\s]+|["'\s]+$/g, ""))
    .filter((s) => s.length > 15);

  for (const pat of patterns) {
    const match = sentences.find((s) => pat.test(s));
    if (match) {
      return match.length > 180 ? match.substring(0, 177) + "..." : match;
    }
  }
  return "";
}

/**
 * Deterministic local analyzer that inspects contract text using vetted regex patterns.
 * Acts as Provider #4 fallback to guarantee 100% demo resilience with zero external APIs.
 *
 * @param text - Sanitized contract text to audit.
 * @returns Fully structured AnalysisResult.
 */
export function runLocalClauseAnalysis(text: string): AnalysisResult {
  const flaggedClauses: FlaggedClause[] = [];
  const missingProtections: MissingProtection[] = [];

  // Trap 1: Training bond & exit penalties
  const bondPatterns = [
    /training bond/i,
    /liquidated damages/i,
    /reimburse the company/i,
    /exit penalty/i,
    /training expense/i,
    /fine of/i,
    /penalty of/i,
    /mandatory.*tenure/i,
  ];
  if (bondPatterns.some((p) => p.test(text))) {
    const quote =
      findMatchingSnippet(text, bondPatterns) ||
      "Liquidated damages and training expenses reimbursement clause.";
    flaggedClauses.push({
      title: "Exit Bond & Financial Penalty",
      quote,
      risk: "High",
      whyItMatters:
        "Financial exit penalties force you to pay massive fines if you leave, locking you into the job.",
      negotiationLine:
        "Please remove the financial exit penalty so separation terms remain fair and voluntary.",
    });
  }

  // Trap 2: Pay withholding & deposit cuts
  const withholdPatterns = [
    /withhold/i,
    /retained/i,
    /security deposit/i,
    /deduction/i,
    /painting/i,
    /cleaning fee/i,
  ];
  if (withholdPatterns.some((p) => p.test(text))) {
    const quote =
      findMatchingSnippet(text, withholdPatterns) ||
      "Mandatory withholding from compensation or non-negotiable deposit deduction.";
    flaggedClauses.push({
      title: "Unfair Pay Withholding & Deposit Cuts",
      quote,
      risk: "High",
      whyItMatters:
        "Withholding earned wages or enforcing automatic deposit cuts reduces your cash flow without cause.",
      negotiationLine:
        "Please disburse all earned pay on time and base any deposit deductions only on actual verified damage.",
    });
  }

  // Trap 3: Asymmetric notice & immediate termination
  const noticePatterns = [
    /90 days/i,
    /notice period/i,
    /unilateral/i,
    /terminate immediately/i,
    /without prior notice/i,
    /without explanation/i,
    /7 days/i,
  ];
  if (noticePatterns.some((p) => p.test(text))) {
    const quote =
      findMatchingSnippet(text, noticePatterns) ||
      "Unilateral immediate termination rights and asymmetrical notice requirements.";
    flaggedClauses.push({
      title: "One-Sided Notice & Termination Trap",
      quote,
      risk: "High",
      whyItMatters:
        "Long notice required from you while the other party can terminate immediately leaves you vulnerable.",
      negotiationLine:
        "Please make notice and termination terms mutual (e.g., 30 days for both parties).",
    });
  }

  // Trap 4: Personal IP and weekend project grab
  const ipPatterns = [
    /intellectual property/i,
    /irrevocably assign/i,
    /personal side project/i,
    /weekend/i,
    /off-duty/i,
    /personal equipment/i,
    /inventions/i,
  ];
  if (ipPatterns.some((p) => p.test(text))) {
    const quote =
      findMatchingSnippet(text, ipPatterns) ||
      "Assignment of all intellectual property, including weekend or off-duty creations.";
    flaggedClauses.push({
      title: "Personal IP & Weekend Code Grab",
      quote,
      risk: "High",
      whyItMatters:
        "Claiming personal side projects or off-hours code extends far beyond legitimate company work.",
      negotiationLine:
        "Please limit IP assignment strictly to company projects created on company time.",
    });
  }

  // Trap 5: Non-compete restrictions
  const nonCompetePatterns = [
    /non-compete/i,
    /shall not work/i,
    /consult.*start any business/i,
    /following separation/i,
  ];
  if (nonCompetePatterns.some((p) => p.test(text))) {
    const quote =
      findMatchingSnippet(text, nonCompetePatterns) ||
      "Non-compete clause restricting employment post-separation.";
    flaggedClauses.push({
      title: "Restrictive Non-Compete",
      quote,
      risk: "Medium",
      whyItMatters:
        "Broad non-compete terms prevent you from finding other employment in your field.",
      negotiationLine:
        "Please remove the non-compete clause to comply with standard industry practices.",
    });
  }

  // Trap 6: Landlord unrestricted entry & repair disclaimers
  const entryPatterns = [
    /enter and inspect/i,
    /without prior notice/i,
    /day or night/i,
    /zero repair/i,
    /exclusively responsible/i,
  ];
  if (entryPatterns.some((p) => p.test(text))) {
    const quote =
      findMatchingSnippet(text, entryPatterns) ||
      "Unannounced property inspection and complete disclaimer of repair obligations.";
    flaggedClauses.push({
      title: "Unannounced Entry & Disclaimed Repairs",
      quote,
      risk: "High",
      whyItMatters:
        "Unannounced entry violates tenant privacy, and shifting all structural repairs onto you is unfair.",
      negotiationLine:
        "Please require 24 hours prior written notice before entry, and maintain landlord repair duties.",
    });
  }

  // Trap 7: Delayed deposit refund & forfeiture
  const refundPatterns = [
    /90 to 120 days/i,
    /sole convenience/i,
    /forfeit/i,
    /completely forfeited/i,
  ];
  if (refundPatterns.some((p) => p.test(text))) {
    const quote =
      findMatchingSnippet(text, refundPatterns) ||
      "Deposit refund delayed up to 120 days or subject to total forfeiture.";
    flaggedClauses.push({
      title: "Delayed Deposit Refund & Forfeiture",
      quote,
      risk: "High",
      whyItMatters:
        "Holding deposits for months or seizing them without cause holds your money hostage.",
      negotiationLine:
        "Please specify that the deposit must be refunded within 14 days of move-out.",
    });
  }

  // Missing protections
  if (!/14 days|14 business days/i.test(text)) {
    missingProtections.push({
      title: "14-Day Deposit Return Timeline",
      whyItMatters:
        "Without an explicit deadline, deposit refunds can be delayed indefinitely.",
      askFor:
        "Please specify that the security deposit will be refunded within 14 days of vacancy.",
    });
  }

  if (
    !/mutual notice/i.test(text) &&
    noticePatterns.some((p) => p.test(text))
  ) {
    missingProtections.push({
      title: "Mutual Notice Safeguard",
      whyItMatters:
        "You need equal protection against unexpected contract termination.",
      askFor:
        "Please ensure the notice period applies mutually to both parties.",
    });
  }

  if (entryPatterns.some((p) => p.test(text))) {
    missingProtections.push({
      title: "Landlord Maintenance Obligations",
      whyItMatters:
        "Tenants should not be on the hook for major electrical or plumbing failures.",
      askFor:
        "Please add standard terms obligating the landlord to handle structural repairs.",
    });
  }

  if (ipPatterns.some((p) => p.test(text))) {
    missingProtections.push({
      title: "Personal Side Project Carveout",
      whyItMatters:
        "You could inadvertently lose rights to your own portfolio and weekend code.",
      askFor:
        "Please explicitly carve out personal open-source projects created outside working hours.",
    });
  }

  // Fallback if no specific traps were matched
  if (flaggedClauses.length === 0) {
    flaggedClauses.push({
      title: "Standard Review Baseline",
      quote: text.slice(0, 140).trim() || "Agreement terms under review.",
      risk: "Low",
      whyItMatters: "No severe predatory terms were detected in this excerpt.",
      negotiationLine:
        "Always ensure key compensation, termination rules, and deliverables are stated explicitly in writing.",
    });
  }

  if (missingProtections.length === 0) {
    missingProtections.push({
      title: "Standard 30-Day Notice Clause",
      whyItMatters:
        "A clear notice period gives both sides time to transition smoothly.",
      askFor:
        "Please add a standard 30-day mutual notice requirement before termination.",
    });
  }

  // Compute overall risk & score
  const highCount = flaggedClauses.filter((c) => c.risk === "High").length;
  const medCount = flaggedClauses.filter((c) => c.risk === "Medium").length;

  let overallRisk: RiskLevel = "Low";
  let riskScore = 25;

  if (highCount >= 2) {
    overallRisk = "High";
    riskScore = Math.min(95, 75 + highCount * 5);
  } else if (highCount === 1 || medCount >= 2) {
    overallRisk = "High";
    riskScore = 70;
  } else if (medCount === 1) {
    overallRisk = "Medium";
    riskScore = 50;
  }

  const summary =
    overallRisk === "High"
      ? `This agreement contains ${highCount} severe terms including exit penalties, pay withholding, or asymmetric termination.`
      : overallRisk === "Medium"
      ? "This agreement has a few one-sided clauses that should be clarified and balanced before signing."
      : "This agreement appears largely standard, but ensure key notice and payment terms are documented.";

  const negotiationEmail: NegotiationEmail = {
    subject: "Discussion Regarding Proposed Agreement Terms",
    body: `Hello,\n\nThank you for sharing the agreement for review.\n\nI have reviewed the terms and would like to propose a few minor adjustments to ensure the agreement is balanced and standard for both parties. In particular, I would appreciate discussing ${
      flaggedClauses.length > 0
        ? `the ${flaggedClauses[0].title.toLowerCase()} and ensuring notice/termination terms are mutual`
        : "the notice period and standard exit protections"
    }.\n\nPlease let me know when you are available for a brief discussion.\n\nBest regards,\n[Your Name]`,
  };

  return {
    overallRisk,
    riskScore,
    summary,
    flaggedClauses,
    missingProtections,
    negotiationEmail,
  };
}

/**
 * Normalizes, validates, and sanitizes untrusted raw model output into a strictly-typed AnalysisResult.
 *
 * @param raw - The untrusted JSON payload.
 * @param fallbackText - Original document text to fall back on if normalization fails completely.
 * @returns Normalized AnalysisResult.
 */
export function normalizeAnalysisResult(
  raw: unknown,
  fallbackText: string
): AnalysisResult {
  if (!raw || typeof raw !== "object") {
    return runLocalClauseAnalysis(fallbackText);
  }

  const data = raw as RawAnalysisData;

  const validRisks: RiskLevel[] = ["Low", "Medium", "High"];
  const overallRisk: RiskLevel =
    typeof data.overallRisk === "string" &&
    validRisks.includes(data.overallRisk as RiskLevel)
      ? (data.overallRisk as RiskLevel)
      : "Medium";

  const rawScore = Number(data.riskScore);
  const riskScore =
    !isNaN(rawScore) && Number.isFinite(rawScore)
      ? Math.min(100, Math.max(0, Math.round(rawScore)))
      : 50;

  const summary =
    typeof data.summary === "string" && data.summary.trim().length > 0
      ? data.summary.trim()
      : "Document review completed. Review the flagged clauses and missing protections below.";

  const rawClauses = Array.isArray(data.flaggedClauses)
    ? (data.flaggedClauses as RawFlaggedClause[])
    : [];

  const flaggedClauses: FlaggedClause[] = rawClauses.map((clause) => {
    const r = typeof clause.risk === "string" ? clause.risk : "";
    const riskVal: RiskLevel = validRisks.includes(r as RiskLevel)
      ? (r as RiskLevel)
      : "Medium";

    return {
      title: String(clause.title || "Flagged Clause").trim(),
      quote: String(clause.quote || "").trim(),
      risk: riskVal,
      whyItMatters: String(
        clause.whyItMatters || "This term may adversely affect your rights."
      ).trim(),
      negotiationLine: String(
        clause.negotiationLine ||
          "Please adjust this term to standard industry terms."
      ).trim(),
    };
  });

  const rawProtections = Array.isArray(data.missingProtections)
    ? (data.missingProtections as RawMissingProtection[])
    : [];

  const missingProtections: MissingProtection[] = rawProtections.map((item) => ({
    title: String(item.title || "Standard Protection").trim(),
    whyItMatters: String(
      item.whyItMatters || "Standard protections ensure balanced rights."
    ).trim(),
    askFor: String(
      item.askFor || "Please add standard protections to this section."
    ).trim(),
  }));

  const rawEmail = (
    data.negotiationEmail && typeof data.negotiationEmail === "object"
      ? data.negotiationEmail
      : {}
  ) as RawNegotiationEmail;

  const negotiationEmail: NegotiationEmail = {
    subject: String(
      rawEmail.subject || "Discussion Regarding Proposed Agreement Terms"
    ).trim(),
    body: String(
      rawEmail.body ||
        "Hello,\n\nThank you for sharing the agreement. I would appreciate the opportunity to discuss a few clauses to ensure the terms are standard and mutual.\n\nBest regards,\n[Your Name]"
    ).trim(),
  };

  return {
    overallRisk,
    riskScore,
    summary,
    flaggedClauses,
    missingProtections,
    negotiationEmail,
  };
}
