/**
 * @fileoverview Core business logic, validation rules, deterministic clause analyzer,
 * and shared data types for VetoAI document risk audits.
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
 * Normalizes any raw risk string into standard severity tiers.
 * Missing, undefined, or unrecognized values return "Unrated" without silently coercing to Low.
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
 * Detects contract category based on distinctive keywords and legal phrasing.
 * Categories: rental, internship, saas_fintech, or general.
 *
 * @param text - Contract text to classify.
 * @returns Detected DocumentCategory.
 */
export function detectDocumentCategory(text: string): DocumentCategory {
  const lower = text.toLowerCase();

  const rentalPatterns = [
    /\brents?\b/i,
    /\brentals?\b/i,
    /\blandlords?\b/i,
    /\btenants?\b/i,
    /\bleases?\b/i,
    /\bsecurity deposit\b/i,
    /\bpremises\b/i,
    /\blessor\b/i,
    /\blessee\b/i,
  ];

  const internshipPatterns = [
    /\binterns?\b/i,
    /\binternships?\b/i,
    /\bstipends?\b/i,
    /\btraining bond\b/i,
    /\boffer letter\b/i,
    /\bprobation\b/i,
    /\bnon-compete\b/i,
    /\bemployment\b/i,
  ];

  const saasFintechPatterns = [
    /\bsubscriptions?\b/i,
    /\bauto-renew(?:al)?\b/i,
    /\bfree trial\b/i,
    /\bterms of service\b/i,
    /\bterms of use\b/i,
    /\buser data\b/i,
    /\bai training\b/i,
    /\bliability\b/i,
    /\bapr\b/i,
    /\bemi\b/i,
    /\bbanks?\b/i,
    /\bfees?\b/i,
    /\bplatform\b/i,
    /\bsoftware as a service\b/i,
    /\bsaas\b/i,
    /\bfintech\b/i,
  ];

  let rentalScore = 0;
  for (const pat of rentalPatterns) {
    if (pat.test(lower)) rentalScore++;
  }

  let internshipScore = 0;
  for (const pat of internshipPatterns) {
    if (pat.test(lower)) internshipScore++;
  }

  let saasScore = 0;
  for (const pat of saasFintechPatterns) {
    if (pat.test(lower)) saasScore++;
  }

  if (rentalScore > 0 && rentalScore >= internshipScore && rentalScore >= saasScore) {
    return "rental";
  }
  if (internshipScore > 0 && internshipScore >= saasScore) {
    return "internship";
  }
  if (saasScore > 0) {
    return "saas_fintech";
  }
  return "general";
}

/**
 * Deterministic local analyzer that inspects contract text using vetted regex patterns.
 * Acts as Provider #4 fallback to guarantee 100% demo resilience with zero external APIs.
 * Aware of document category (rental, internship, saas_fintech) for tailored traps and safeguards.
 *
 * @param text - Sanitized contract text to audit.
 * @returns Fully structured AnalysisResult.
 */
export function runLocalClauseAnalysis(text: string): AnalysisResult {
  const category = detectDocumentCategory(text);
  const flaggedClauses: FlaggedClause[] = [];
  const missingProtections: MissingProtection[] = [];

  // Trap 1: Training bond & exit penalties (internship / employment)
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

  // Trap 2: Pay withholding & deposit cuts (internship / rental)
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

  // Trap 6: Landlord unrestricted entry & repair disclaimers (rental)
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

  // Trap 7: Delayed deposit refund & forfeiture (rental)
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

  // Trap 8: Auto-Renewal / Postal Cancellation / Non-Refundable Charges (saas_fintech)
  const autoRenewPatterns = [
    /auto-renew(?:al)?/i,
    /automatic renewal/i,
    /cancel.*(?:written notice|registered post|postal mail|postal|certified mail)/i,
    /non-refundable/i,
    /no refunds/i,
    /all (?:fees|charges|payments) are non-refundable/i,
  ];
  if (autoRenewPatterns.some((p) => p.test(text))) {
    const quote =
      findMatchingSnippet(text, autoRenewPatterns) ||
      "Automatic subscription renewal and non-refundable fees policy.";
    flaggedClauses.push({
      title: "Auto-Renewal & Burdensome Cancellation",
      quote,
      risk: "High",
      whyItMatters:
        "Automatic renewals paired with non-refundable charges or postal cancellation requirements trap you into paying for unwanted recurring billing cycles.",
      negotiationLine:
        "Please provide simple digital one-click cancellation and pro-rata refunds for unused subscription periods.",
    });
  }

  // Trap 9: Broad IP / Selling or Sharing User Data / AI Training License (saas_fintech)
  const dataAiPatterns = [
    /sell(?:ing)?.*(?:user data|personal data|consumer data|information)/i,
    /share.*(?:third parties|partners|advertisers).*without.*consent/i,
    /ai training/i,
    /train.*(?:ai|model|models|algorithm|machine learning)/i,
    /perpetual.*irrevocable.*(?:license|right).*user content/i,
    /worldwide.*royalty-free.*license.*(?:content|data)/i,
    /monetize.*(?:data|information)/i,
  ];
  if (dataAiPatterns.some((p) => p.test(text))) {
    const quote =
      findMatchingSnippet(text, dataAiPatterns) ||
      "Perpetual data rights, third-party data sharing, or AI model training license.";
    flaggedClauses.push({
      title: "Broad Data Exploitation & AI Training",
      quote,
      risk: "High",
      whyItMatters:
        "Granting broad rights to monetize user data, share information with third parties, or conduct AI model training compromises your proprietary data and privacy.",
      negotiationLine:
        "Please clarify that user data remains strictly confidential and cannot be shared with third parties or used for AI model training.",
    });
  }

  // Trap 10: Tiny Liability Caps + Immediate Data Deletion (saas_fintech)
  const liabilityPatterns = [
    /liability.*(?:shall not exceed|limited to|capped at).*(?:inr|rs\.?|\$|usd|eur)?\s*(?:250|500|100|50|one month|amount paid)/i,
    /total aggregate liability.*(?:250|500|one month|amount paid)/i,
    /immediate(?:ly)?.*delet(?:e|ion).*data/i,
    /delete.*without.*(?:export|backup)/i,
    /no obligation to (?:retain|return) data/i,
    /data deletion upon termination/i,
  ];
  if (liabilityPatterns.some((p) => p.test(text))) {
    const quote =
      findMatchingSnippet(text, liabilityPatterns) ||
      "Liability capped at a token amount with immediate data deletion on termination.";
    flaggedClauses.push({
      title: "Tiny Liability Cap & Immediate Data Deletion",
      quote,
      risk: "High",
      whyItMatters:
        "Limiting liability to a negligible token amount (e.g. ₹250–500) while immediately purging your data upon termination leaves you with zero recourse and lost assets if the service fails.",
      negotiationLine:
        "Please increase the liability cap to reasonable direct damages and grant a 30-day window to export data upon termination.",
    });
  }

  // Trap 11: Hidden Fees / Retroactive Interest Spikes / Auto-Debit (saas_fintech)
  const feeDebitPatterns = [
    /retroactive(?:ly)?/i,
    /interest rate.*(?:increase|revised|spike|adjusted).*without/i,
    /auto-debit.*without.*notice/i,
    /hidden fee/i,
    /unilateral.*fee/i,
    /revise.*(?:fee|rate).*at.*sole discretion/i,
    /convenience fee.*without prior/i,
    /processing fee.*without prior/i,
    /charge.*without.*prior authorization/i,
  ];
  if (feeDebitPatterns.some((p) => p.test(text))) {
    const quote =
      findMatchingSnippet(text, feeDebitPatterns) ||
      "Unilateral fee revisions, retroactive interest changes, or auto-debiting without notice.";
    flaggedClauses.push({
      title: "Hidden Fees & Unilateral Auto-Debit",
      quote,
      risk: "High",
      whyItMatters:
        "Allowing unilateral fee changes, retroactive interest hikes, or unexpected auto-debits exposes you to arbitrary financial charges without consent.",
      negotiationLine:
        "Please require 30 days prior written notice before any fee or rate adjustments, and eliminate non-negotiable auto-debits.",
    });
  }

  // Category-specific Missing Protections
  if (category === "rental") {
    if (!/14 days|14 business days/i.test(text)) {
      missingProtections.push({
        title: "14-Day Deposit Return Timeline",
        whyItMatters:
          "Without an explicit deadline, security deposit refunds can be delayed indefinitely.",
        askFor:
          "Please specify that the security deposit will be refunded in full within 14 days of vacancy.",
      });
    }

    missingProtections.push({
      title: "Landlord Maintenance Obligations",
      whyItMatters:
        "Tenants should not be on the hook for major electrical, plumbing, or structural repairs.",
      askFor:
        "Please add standard terms obligating the landlord to handle major maintenance and structural repairs.",
    });

    if (noticePatterns.some((p) => p.test(text)) && !/mutual notice/i.test(text)) {
      missingProtections.push({
        title: "Mutual Notice Safeguard",
        whyItMatters:
          "You need equal protection against unexpected lease termination or sudden eviction.",
        askFor:
          "Please ensure the notice period for lease termination applies mutually to landlord and tenant.",
      });
    }
  } else if (category === "internship") {
    if (ipPatterns.some((p) => p.test(text)) || !/carveout|personal project/i.test(text)) {
      missingProtections.push({
        title: "Personal Side Project Carveout",
        whyItMatters:
          "You could inadvertently lose rights to your own portfolio and weekend open-source code.",
        askFor:
          "Please explicitly carve out personal open-source projects created outside working hours.",
      });
    }

    if (noticePatterns.some((p) => p.test(text)) && !/mutual notice/i.test(text)) {
      missingProtections.push({
        title: "Mutual Notice Safeguard",
        whyItMatters:
          "You need equal protection against unexpected contract termination without cause.",
        askFor:
          "Please ensure the notice period applies mutually to both parties.",
      });
    }

    missingProtections.push({
      title: "Guaranteed Timely Stipend Release",
      whyItMatters:
        "Interns rely on predictable monthly compensation to cover living expenses without arbitrary holdbacks.",
      askFor:
        "Please guarantee 100% full monthly stipend disbursement on time without security holdbacks.",
    });
  } else if (category === "saas_fintech") {
    missingProtections.push({
      title: "Digital Cancellation & Refunds",
      whyItMatters:
        "Without clear self-service cancellation, you can be locked into unwanted recurring subscription charges.",
      askFor:
        "Please provide one-click digital cancellation and pro-rata refunds for unused billing periods.",
    });

    missingProtections.push({
      title: "30-Day Data Export Window",
      whyItMatters:
        "If a provider terminates service, you risk permanently losing your customer data and uploaded assets.",
      askFor:
        "Please guarantee a 30-day post-termination window to export all user data in standard formats.",
    });

    missingProtections.push({
      title: "Fair Liability Cap",
      whyItMatters:
        "A token cap (like ₹250 or one month's fee) leaves you unprotected against major service outages or data breaches.",
      askFor:
        "Please adjust the liability limitation to a fair amount tied to direct damages (e.g. 12 months of fees).",
    });
  } else {
    missingProtections.push({
      title: "Standard 30-Day Notice Clause",
      whyItMatters:
        "A clear notice period gives both sides time to transition smoothly.",
      askFor:
        "Please add a standard 30-day mutual notice requirement before termination.",
    });

    missingProtections.push({
      title: "Mutual Fairness & Dispute Resolution",
      whyItMatters:
        "Clear terms prevent one-sided obligations and unannounced contract changes.",
      askFor:
        "Please include balanced mutual terms for termination and dispute resolution.",
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

  // Dynamic negotiation email unique to document category and findings
  let emailSubject = "Discussion Regarding Proposed Agreement Terms";
  let emailOpening =
    "Thank you for sharing the agreement for review. Before signing, I have reviewed the terms and would like to propose a few adjustments to ensure the agreement is balanced and standard for both parties:";

  if (category === "internship") {
    emailSubject = "Proposed Revisions to Internship Offer Letter";
    emailOpening =
      "Thank you for extending this internship offer. I am genuinely excited about the role and contributing to the team. Before signing, I reviewed the agreement terms and would appreciate discussing a few adjustments to ensure standard, balanced terms:";
  } else if (category === "rental") {
    emailSubject = "Request for Balanced Residential Lease Terms";
    emailOpening =
      "Thank you for sharing the tenancy agreement. I look forward to the tenancy. Before finalizing, I reviewed the agreement and would like to propose a few standard adjustments to ensure fair and balanced terms for both parties:";
  } else if (category === "saas_fintech") {
    emailSubject = "Request for Fair Terms & Consumer Protections";
    emailOpening =
      "Thank you for providing the service agreement. Before proceeding, I reviewed the terms of service and would appreciate addressing a few clauses to ensure fair consumer protections and balanced obligations:";
  }

  const emailItems: string[] = [];
  flaggedClauses.forEach((c) => {
    emailItems.push(`${c.title}: "${c.negotiationLine}"`);
  });
  missingProtections.forEach((p) => {
    emailItems.push(`${p.title}: "${p.askFor}"`);
  });

  const numberedList = emailItems
    .map((item, idx) => `${idx + 1}. ${item}`)
    .join("\n\n");

  const emailBody = `Hello,\n\n${emailOpening}\n\n${numberedList}\n\nCould we discuss these points and incorporate these adjustments into the final agreement? I would be glad to hop on a quick call or review an updated draft at your convenience.\n\nThank you for your time and understanding.\n\nBest regards,\n[Your Name]`;

  const negotiationEmail: NegotiationEmail = {
    subject: emailSubject,
    body: emailBody,
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
