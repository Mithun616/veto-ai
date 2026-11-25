/**
 * @fileoverview Core business logic, validation rules, deterministic clause analyzer,
 * and result normalizer for VetoAI document risk audits.
 *
 * Modularly re-exports:
 * - Data types and interfaces from `./veto-types`
 * - Quote verification and alignment heuristics from `./veto-verify`
 * - Negotiation email assembly from `./veto-email`
 */

import type {
  DocumentCategory,
  FlaggedClause,
  MissingProtection,
  NegotiationEmail,
  RawAnalysisData,
  RawFlaggedClause,
  RawMissingProtection,
  RiskLevel,
  AnalysisResult,
  NormalizedSeverity,
} from "./veto-types.ts";
import { getNormalizedSeverity, getSeverityRank } from "./veto-types.ts";
import { isEvidenceAligned, verifySourceQuote } from "./veto-verify.ts";
import { buildNegotiationEmail } from "./veto-email.ts";

// Re-export types and functions for seamless backward compatibility across the codebase
export type {
  DocumentCategory,
  FlaggedClause,
  MissingProtection,
  NegotiationEmail,
  RawAnalysisData,
  RawFlaggedClause,
  RawMissingProtection,
  RiskLevel,
  AnalysisResult,
  NormalizedSeverity,
};
export { getNormalizedSeverity, getSeverityRank };
export * from "./veto-verify.ts";
export * from "./veto-email.ts";

// ---------------------------------------------------------------------------
// Constants & Safety Bounds
// ---------------------------------------------------------------------------

export const MAX_FILE_SIZE = 4 * 1024 * 1024;
export const MIN_DOCUMENT_LENGTH = 20;
export const MAX_DOCUMENT_LENGTH = 15000;
export const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".txt"] as const;

export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
] as const;

export const BASE_SYSTEM_PROMPT = `You are VetoAI, an objective, plain-English contract risk reviewer built for students, freshers, tenants, and consumers.
Your job is to detect one-sided, unfair, predatory, or high-risk clauses in agreements and offer diplomatic, respectful counter-proposals.

CRITICAL INSTRUCTIONS FOR OBJECTIVE REVIEW:
1. FOCUS EXCLUSIVELY ON UNFAIR & PREDATORY TERMS: Flag terms such as training bonds/penalties, non-competes, wage/stipend withholding, one-sided termination notice, unannounced entry/inspection, structural repair waivers, forfeiture of security deposits, excessive non-refundable fees, and broad IP grabs on personal side projects.
2. DO NOT FLAG STANDARD FAIR TERMS: Standard 30-day notice periods, timely rent payment, reasonable security deposits (1-2 months), standard confidentiality, and routine office policies are normal and should NOT be flagged as High risk.
3. CONTEXT-AWARE REVIEW: Identify whether the document is an internship offer, tenancy agreement, employment contract, or service agreement.
4. QUOTE ACCURACY: Extract short, direct quotes (1-2 sentences) verbatim from the text.
5. RESPECTFUL PUSHBACK: For every flagged clause, provide a diplomatic negotiation line suitable for an email to HR or a landlord.
6. MISSING PROTECTIONS: List critical protections omitted from the agreement (e.g. 14-day deposit return timeline, landlord repair obligations, mutual termination notice).`;

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
    return { valid: false, error: "Document text must be a valid string.", text: "" };
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

  return { valid: true, text: trimmed };
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
    return { valid: false, error: `File size (${sizeMb} MB) exceeds the 4 MB limit.` };
  }

  const lowerName = filename.toLowerCase();
  const hasValidExt = ALLOWED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
  if (!hasValidExt) {
    return { valid: false, error: "Unsupported file extension. Please upload a .pdf, .docx, or .txt document." };
  }

  if (mimeType && mimeType.trim() !== "") {
    const isAllowedMime =
      ALLOWED_MIME_TYPES.includes(mimeType as (typeof ALLOWED_MIME_TYPES)[number]) ||
      mimeType.startsWith("text/");
    if (!isAllowedMime) {
      return { valid: false, error: `Unsupported file type (${mimeType}). Please upload a valid .pdf, .docx, or .txt document.` };
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
        return JSON.parse(raw.substring(firstBrace, lastBrace + 1));
      }
      throw new Error("No valid JSON object found in model output.");
    }
  }
}

// ---------------------------------------------------------------------------
// Document Category Detection
// ---------------------------------------------------------------------------

/**
 * Detects all applicable document categories present in the text.
 *
 * @param text - Contract text to classify.
 * @returns Array of detected DocumentCategory identifiers.
 */
export function detectDocumentCategories(text: string): DocumentCategory[] {
  const lower = text.toLowerCase();

  const rentalPatterns = [
    /\brents?\b/i, /\brentals?\b/i, /\blandlords?\b/i, /\btenants?\b/i,
    /\bleases?\b/i, /\bsecurity deposit\b/i, /\bpremises\b/i, /\blessor\b/i,
    /\blessee\b/i, /\baccommodation\b/i, /\bhousing\b/i,
  ];

  const internshipPatterns = [
    /\binterns?\b/i, /\binternships?\b/i, /\bstipends?\b/i, /\btraining bond\b/i,
    /\boffer letter\b/i, /\bprobation\b/i, /\bnon-compete\b/i, /\bemployment\b/i,
  ];

  const saasFintechPatterns = [
    /\bsubscriptions?\b/i, /\bauto-renew(?:al)?\b/i, /\bfree trial\b/i,
    /\bterms of service\b/i, /\bterms of use\b/i, /\buser data\b/i,
    /\bai training\b/i, /\bliability\b/i, /\bapr\b/i, /\bemi\b/i,
    /\bbanks?\b/i, /\bfees?\b/i, /\bplatform\b/i, /\bsoftware as a service\b/i,
    /\bsaas\b/i, /\bfintech\b/i, /\bauto-debit\b/i,
  ];

  const hasRental = rentalPatterns.some((p) => p.test(lower));
  const hasIntern = internshipPatterns.some((p) => p.test(lower));
  const hasSaas = saasFintechPatterns.some((p) => p.test(lower));

  const categories: DocumentCategory[] = [];
  if (hasRental) categories.push("rental");
  if (hasIntern) categories.push("internship");
  if (hasSaas) categories.push("saas_fintech");

  if (categories.length === 0) categories.push("general");
  return categories;
}

/**
 * Returns the primary category for single-value backward compatibility.
 *
 * @param text - Contract text to classify.
 * @returns Primary detected DocumentCategory.
 */
export function detectDocumentCategory(text: string): DocumentCategory {
  const cats = detectDocumentCategories(text);
  if (cats.length <= 1) return cats[0] || "general";

  const lower = text.toLowerCase();
  const rentalCount = (lower.match(/\b(rent|landlord|tenant|lease|premises)\b/g) || []).length;
  const internCount = (lower.match(/\b(intern|stipend|training bond|offer letter)\b/g) || []).length;
  const saasCount = (lower.match(/\b(subscription|auto-renew|user data|ai training|bank)\b/g) || []).length;

  if (rentalCount >= internCount && rentalCount >= saasCount) return "rental";
  if (internCount >= saasCount) return "internship";
  if (saasCount > 0) return "saas_fintech";
  return cats[0] || "general";
}

// ---------------------------------------------------------------------------
// Local Deterministic Clause-Pattern Engine
// ---------------------------------------------------------------------------

type ClauseAdder = (title: string, quote: string, risk: RiskLevel, why: string, pushback: string) => void;
type ProtectionAdder = (title: string, why: string, askFor: string) => void;

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

const NOTICE_PATTERNS = [
  /(?:90|60|30)\s*days\s*(?:written\s*)?notice|notice.*?(?:90|60|30)\s*days/i,
  /notice prior to resignation.*?subject to.*approval/i,
  /company reserves the right to terminate.*?(?:immediately without prior notice|immediately)/i,
  /terminate this tenancy with 7 days verbal notice/i,
];

/**
 * Detects employment and internship predatory traps (exit bonds, stipend withholding, IP grabs).
 */
function detectInternshipTraps(text: string, addClause: ClauseAdder): void {
  const bondPatterns = [/training bond/i, /liquidated damages/i, /reimburse the company/i, /exit penalty/i, /training expense/i, /fine of/i, /penalty of/i, /mandatory.*tenure/i];
  if (bondPatterns.some((p) => p.test(text))) {
    addClause("Exit Bond & Financial Penalty", findMatchingSnippet(text, bondPatterns) || "Liquidated damages and training expenses reimbursement clause.", "High", "Financial exit penalties force you to pay massive fines if you leave, locking you into the job.", "Please remove the financial exit penalty so separation terms remain fair and voluntary.");
  }

  const withholdPatterns = [/50%\s*of\s*(?:the\s*)?(?:monthly\s*)?stipend.*?retained/i, /stipend.*?retained.*?as.*?security deposit/i, /retained by the company as a 'security deposit'/i, /mandatory non-negotiable deduction for painting/i, /deducted for painting and deep cleaning/i];
  if (withholdPatterns.some((p) => p.test(text))) {
    addClause("Unfair Pay Withholding & Deposit Cuts", findMatchingSnippet(text, withholdPatterns) || "Mandatory withholding from compensation or non-negotiable deposit deduction.", "High", "Withholding earned wages or enforcing automatic deposit cuts reduces your cash flow without cause.", "Please disburse all earned pay on time and base any deposit deductions only on actual verified damage.");
  }

  if (NOTICE_PATTERNS.some((p) => p.test(text))) {
    addClause("One-Sided Notice & Termination Trap", findMatchingSnippet(text, NOTICE_PATTERNS) || "Unilateral immediate termination rights and asymmetrical notice requirements.", "High", "Long notice required from you while the other party can terminate immediately leaves you vulnerable.", "Please make notice and termination terms mutual (e.g., 30 days for both parties).");
  }

  const ipPatterns = [/intellectual property/i, /irrevocably assign/i, /personal side project/i, /weekend/i, /off-duty/i, /personal equipment/i, /inventions/i];
  if (ipPatterns.some((p) => p.test(text))) {
    addClause("Personal IP & Weekend Code Grab", findMatchingSnippet(text, ipPatterns) || "Assignment of all intellectual property, including weekend or off-duty creations.", "High", "Claiming personal side projects or off-hours code extends far beyond legitimate company work.", "Please limit IP assignment strictly to company projects created on company time.");
  }

  const nonCompetePatterns = [/non-compete/i, /shall not work/i, /consult.*start any business/i, /following separation/i];
  if (nonCompetePatterns.some((p) => p.test(text))) {
    addClause("Restrictive Non-Compete", findMatchingSnippet(text, nonCompetePatterns) || "Non-compete clause restricting employment post-separation.", "Medium", "Broad non-compete terms prevent you from finding other employment in your field.", "Please remove the non-compete clause to comply with standard industry practices.");
  }
}

/**
 * Detects residential lease and tenancy predatory traps (unannounced entry, delayed refunds, waived repairs).
 */
function detectRentalTraps(text: string, addClause: ClauseAdder): void {
  const entryPatterns = [/enter and inspect/i, /(?:enter|inspect|access).*?(?:without (?:prior\s*)?notice|day or night|at any time)/i, /zero repair/i, /exclusively responsible for all repairs/i];
  if (entryPatterns.some((p) => p.test(text))) {
    addClause("Unannounced Entry & Disclaimed Repairs", findMatchingSnippet(text, entryPatterns) || "Unannounced property inspection and complete disclaimer of repair obligations.", "High", "Unannounced entry violates tenant privacy, and shifting all structural repairs onto you is unfair.", "Please require 24 hours prior written notice before entry, and maintain landlord repair duties.");
  }

  const refundPatterns = [/90 to 120 days/i, /refunded at the landlord's sole convenience/i, /entire security deposit.*?completely forfeited/i];
  if (refundPatterns.some((p) => p.test(text))) {
    addClause("Delayed Deposit Refund & Forfeiture", findMatchingSnippet(text, refundPatterns) || "Deposit refund delayed up to 120 days or subject to total forfeiture.", "High", "Holding deposits for months or seizing them without cause holds your money hostage.", "Please specify that the deposit must be refunded within 14 days of move-out.");
  }
}

/**
 * Detects SaaS, fintech, and digital service traps (auto-renewal, AI training licenses, liability caps).
 */
function detectSaasTraps(text: string, addClause: ClauseAdder): void {
  const autoRenewPatterns = [/auto-renew(?:al)?/i, /automatic renewal/i, /cancel.*?(?:written notice|registered post|postal mail|postal|certified mail)/i, /non-refundable/i, /no refunds/i, /all (?:fees|charges|payments) are non-refundable/i];
  if (autoRenewPatterns.some((p) => p.test(text))) {
    addClause("Auto-Renewal & Burdensome Cancellation", findMatchingSnippet(text, autoRenewPatterns) || "Automatic subscription renewal and non-refundable fees policy.", "High", "Automatic renewals paired with non-refundable charges or postal cancellation requirements trap you into paying for unwanted recurring billing cycles.", "Please provide simple digital one-click cancellation and pro-rata refunds for unused subscription periods.");
  }

  const dataAiPatterns = [/sell(?:ing)?.*?(?:user data|personal data|consumer data|information)/i, /share.*?(?:third parties|partners|advertisers).*?without.*?consent/i, /ai training/i, /train.*?(?:ai|model|models|algorithm|machine learning)/i, /perpetual.*?irrevocable.*?(?:license|right).*?user content/i, /worldwide.*?royalty-free.*?license.*?(?:content|data)/i, /monetize.*?(?:data|information)/i];
  if (dataAiPatterns.some((p) => p.test(text))) {
    addClause("Broad Data Exploitation & AI Training", findMatchingSnippet(text, dataAiPatterns) || "Perpetual data rights, third-party data sharing, or AI model training license.", "High", "Granting broad rights to monetize user data, share information with third parties, or conduct AI model training compromises your proprietary data and privacy.", "Please clarify that user data remains strictly confidential and cannot be shared with third parties or used for AI model training.");
  }

  const liabilityPatterns = [/liability.*?(?:shall not exceed|limited to|capped at).*?(?:inr|rs\.?|\$|usd|eur)?\s*(?:250|500|100|50|one month|amount paid)/i, /total aggregate liability.*?(?:250|500|one month|amount paid)/i, /immediate(?:ly)?.*?delet(?:e|ion).*?data/i, /delete.*?without.*?(?:export|backup)/i, /no obligation to (?:retain|return) data/i, /data deletion upon termination/i];
  if (liabilityPatterns.some((p) => p.test(text))) {
    addClause("Tiny Liability Cap & Immediate Data Deletion", findMatchingSnippet(text, liabilityPatterns) || "Liability capped at a token amount with immediate data deletion on termination.", "High", "Limiting liability to a negligible token amount (e.g. ₹250–500) while immediately purging your data upon termination leaves you with zero recourse and lost assets if the service fails.", "Please increase the liability cap to reasonable direct damages and grant a 30-day window to export data upon termination.");
  }

  const feeDebitPatterns = [/retroactive(?:ly)?/i, /(?:interest rate|rate of interest).*?(?:increase|revised|spike|adjusted|alter|modify|change)/i, /(?:fees?|charges?).*?(?:alter|modify|revise|increase).*?(?:at (?:its\s*)?sole discretion|without (?:prior\s*)?notice)/i, /auto-debit.*?(?:without|notice)/i, /hidden fee/i, /credit limit.*?(?:alter|modify|reduce|change).*?(?:without|sole discretion)/i, /convenience fee.*without prior/i, /processing fee.*without prior/i, /charge.*without.*prior authorization/i];
  if (feeDebitPatterns.some((p) => p.test(text))) {
    addClause("Hidden Fees & Unilateral Rate Changes", findMatchingSnippet(text, feeDebitPatterns) || "Unilateral fee revisions, retroactive interest changes, or auto-debiting without notice.", "High", "Allowing unilateral interest rate revisions, unexpected fee changes, or credit limit modifications exposes you to arbitrary financial costs without warning.", "Please require at least 30 days advance written notice before any interest rate, fee, or credit limit changes take effect.");
  }
}

/**
 * Builds contextual missing protections tailored to supported categories.
 */
function buildLocalMissingProtections(text: string, categories: DocumentCategory[], addProtection: ProtectionAdder): void {
  if (categories.includes("rental")) {
    if (!/14 days|14 business days/i.test(text)) {
      addProtection("14-Day Deposit Return Timeline", "Commercial best practices recommend specifying an explicit deadline (e.g. 14–30 days) to prevent delayed deposit returns.", "Consider proposing a clear timeframe (such as 14 to 30 days) for security deposit inspection and return.");
    }
    addProtection("Landlord Maintenance Obligations", "Agreements should clearly allocate major plumbing, electrical, and structural upkeep to the property owner.", "Consider proposing balanced terms allocating structural and major plumbing maintenance to the landlord.");
    if (NOTICE_PATTERNS.some((p) => p.test(text)) && !/mutual notice/i.test(text)) {
      addProtection("Mutual Lease Notice Safeguard", "Equal notice protection guards against sudden lease termination or unexpected vacating demands.", "Consider requesting that notice requirements for lease termination apply mutually to both parties.");
    }
  }

  if (categories.includes("internship")) {
    if (/intellectual property/i.test(text) || !/carveout|personal project/i.test(text)) {
      addProtection("Personal Side Project Carveout", "Without an explicit carveout, you could inadvertently assign rights to personal weekend or portfolio creations.", "Consider proposing an explicit carveout for personal, off-duty open-source and side projects created on personal equipment.");
    }
    if (NOTICE_PATTERNS.some((p) => p.test(text)) && !/mutual notice/i.test(text)) {
      addProtection("Mutual Notice Safeguard", "Balanced notice provisions give both parties predictable transition timing.", "Consider requesting that notice periods apply mutually to both employer and intern.");
    }
    addProtection("Guaranteed Timely Stipend Release", "Stipends should be disbursed predictably each month to cover living expenses without arbitrary holdbacks.", "Consider proposing regular full monthly stipend disbursement without security holdbacks.");
  }

  if (categories.includes("saas_fintech")) {
    const isBanking = /\b(bank|credit|interest rate|apr|emi|loan|borrower|cardholder)\b/i.test(text);
    if (isBanking) {
      addProtection("30-Day Advance Written Notice for Changes", "Without advance written notice, borrowers or cardholders cannot plan for sudden financial spikes or fee revisions.", "Consider requesting at least 30 days prior written notice before any interest rate, fee, or limit revisions take effect.");
      addProtection("Dispute Resolution & Fair Billing Error Timeline", "Clear dispute response windows ensure disputed charges are investigated promptly without penalty.", "Consider requesting a standard 30-day timeline to investigate and resolve disputed charges or billing errors.");
      addProtection("Fair Grace Period Before Penalties", "A reasonable grace period protects consumers from immediate penalty fees for inadvertent processing delays.", "Consider requesting a standard grace period before imposing late payment fees or punitive interest rates.");
    } else {
      addProtection("Digital Cancellation & Refunds", "Without clear self-service cancellation, you can be locked into unwanted recurring subscription charges.", "Consider requesting one-click digital cancellation and pro-rata refunds for unused billing periods.");
      addProtection("30-Day Data Export Window", "If a provider terminates service, you risk permanently losing your customer data and uploaded assets.", "Consider proposing a 30-day post-termination window to export all user data in standard formats.");
      addProtection("Fair Liability Cap", "A token cap (like ₹250 or one month's fee) leaves you unprotected against major service outages or data breaches.", "Consider proposing a liability cap tied to actual fees paid rather than a nominal token amount.");
    }
  }
}

/**
 * Calculates overall risk and numeric score from flagged clauses.
 */
function computeLocalRiskScore(clauses: FlaggedClause[]): { overallRisk: RiskLevel; riskScore: number; summary: string } {
  const highCount = clauses.filter((c) => c.risk === "High").length;
  const medCount = clauses.filter((c) => c.risk === "Medium").length;
  const lowCount = clauses.filter((c) => c.risk === "Low").length;

  let overallRisk: RiskLevel = "Low";
  let riskScore = 0;

  if (highCount >= 2) {
    overallRisk = "High";
    riskScore = Math.min(95, 75 + highCount * 5);
  } else if (highCount === 1) {
    overallRisk = "High";
    riskScore = 70;
  } else if (medCount >= 2) {
    overallRisk = "Medium";
    riskScore = 60;
  } else if (medCount === 1) {
    overallRisk = "Medium";
    riskScore = 40;
  } else if (lowCount > 0) {
    overallRisk = "Low";
    riskScore = 20;
  }

  const summary =
    overallRisk === "High"
      ? `This agreement contains ${highCount} severe term(s) that should be revised before signing.`
      : overallRisk === "Medium"
      ? "This agreement has a few one-sided clauses that should be clarified and balanced before signing."
      : "This agreement appears largely balanced, but ensure key notice and payment terms are documented.";

  return { overallRisk, riskScore, summary };
}

/**
 * Deterministic local analyzer that inspects contract text using vetted regex patterns.
 * Acts as Provider #4 fallback to guarantee 100% demo resilience with zero external APIs.
 *
 * @param text - Sanitized contract text to audit.
 * @returns Fully structured AnalysisResult.
 */
export function runLocalClauseAnalysis(text: string): AnalysisResult {
  const supportedCategories = detectDocumentCategories(text);
  const primaryCategory = supportedCategories[0] || "general";
  const flaggedClauses: FlaggedClause[] = [];
  const missingProtections: MissingProtection[] = [];

  const addClause: ClauseAdder = (title, quote, risk, whyItMatters, negotiationLine) => {
    flaggedClauses.push({ id: `clause-${flaggedClauses.length + 1}`, title, quote, risk, whyItMatters, negotiationLine });
  };

  const addProtection: ProtectionAdder = (title, whyItMatters, askFor) => {
    missingProtections.push({
      id: `protection-${missingProtections.length + 1}`,
      title,
      whyItMatters: `Not found in the supplied text. (Note: may appear elsewhere in the full agreement.) ${whyItMatters}`,
      askFor,
    });
  };

  detectInternshipTraps(text, addClause);
  if (supportedCategories.includes("rental")) detectRentalTraps(text, addClause);
  detectSaasTraps(text, addClause);

  buildLocalMissingProtections(text, supportedCategories, addProtection);

  if (missingProtections.length === 0) {
    addProtection("Standard 30-Day Notice Clause", "A clear notice period gives both sides time to transition smoothly.", "Consider requesting a standard 30-day mutual notice requirement before termination.");
    addProtection("Mutual Fairness & Dispute Resolution", "Clear terms prevent one-sided obligations and unannounced contract changes.", "Consider requesting balanced mutual terms for termination and dispute resolution.");
  }

  const { overallRisk, riskScore, summary } = computeLocalRiskScore(flaggedClauses);
  const negotiationEmail = buildNegotiationEmail(primaryCategory, flaggedClauses, missingProtections);

  return {
    overallRisk,
    riskScore,
    summary,
    flaggedClauses,
    missingProtections,
    negotiationEmail,
    unverifiedCount: 0,
    hasSupportedFindings: flaggedClauses.length > 0,
    reviewStatus: flaggedClauses.length > 0 ? "complete" : "clean",
  };
}

// ---------------------------------------------------------------------------
// Result Normalizer & Integrity Checks
// ---------------------------------------------------------------------------

/**
 * Verifies candidate clauses against source text and logical alignment.
 */
function verifyCandidateClauses(rawClauses: RawFlaggedClause[], sourceText: string) {
  const validRisks: RiskLevel[] = ["Low", "Medium", "High"];
  const verifiedClauses: FlaggedClause[] = [];
  let unverifiedCount = 0;

  for (const clause of rawClauses) {
    const rawQuote = String(clause.quote || "").trim();
    const title = String(clause.title || "Flagged Clause").trim();
    const whyItMatters = String(clause.whyItMatters || "This term may adversely affect your rights.").trim();

    const isSourceVerified = verifySourceQuote(rawQuote, sourceText);
    const isAligned = isEvidenceAligned(rawQuote, title, whyItMatters);

    if (!isSourceVerified || !isAligned) {
      unverifiedCount++;
      continue;
    }

    const r = typeof clause.risk === "string" ? clause.risk : "";
    const riskVal: RiskLevel = validRisks.includes(r as RiskLevel) ? (r as RiskLevel) : "Medium";

    verifiedClauses.push({
      id: `clause-${verifiedClauses.length + 1}`,
      title,
      quote: rawQuote,
      risk: riskVal,
      whyItMatters,
      negotiationLine: String(clause.negotiationLine || "Please adjust this term to standard fair terms.").trim(),
    });
  }

  return { verifiedClauses, unverifiedCount };
}

/**
 * Filters candidate missing protections to remove cross-domain hallucinations.
 */
function filterCandidateProtections(rawProtections: RawMissingProtection[], supportedCategories: DocumentCategory[]): MissingProtection[] {
  const verifiedProtections: MissingProtection[] = [];

  for (const item of rawProtections) {
    const title = String(item.title || "").trim();
    const why = String(item.whyItMatters || "").trim();
    const combined = `${title} ${why}`.toLowerCase();

    if (!supportedCategories.includes("rental") && /\b(landlord|tenant|premises|rent\b|lease\b|14-day deposit|deposit return)/i.test(combined)) {
      continue;
    }
    if (!supportedCategories.includes("internship") && /\b(stipend|training bond|intern\b|side project carveout)/i.test(combined)) {
      continue;
    }
    if (!supportedCategories.includes("saas_fintech") && /\b(cloud data|ai training|data export|digital cancellation|bank\b|interest rate)/i.test(combined)) {
      continue;
    }

    if (title.length > 0) {
      verifiedProtections.push({
        id: `protection-${verifiedProtections.length + 1}`,
        title,
        whyItMatters: why.includes("Not found in the supplied text") ? why : `Not found in the supplied text. (Note: may appear elsewhere in the full agreement.) ${why}`,
        askFor: String(item.askFor || "Please consider proposing standard balanced terms for this topic.").trim(),
      });
    }
  }

  return verifiedProtections;
}

/**
 * Derives normalized risk score, status, and summary from verified findings.
 */
function deriveNormalizedScore(
  verifiedClauses: FlaggedClause[],
  unverifiedCount: number,
  rawSummary?: unknown
): { overallRisk: RiskLevel; riskScore: number; reviewStatus: "complete" | "incomplete_unverified" | "clean"; summary: string } {
  const highCount = verifiedClauses.filter((c) => c.risk === "High").length;
  const medCount = verifiedClauses.filter((c) => c.risk === "Medium").length;

  if (unverifiedCount > 0 && verifiedClauses.length === 0) {
    return {
      overallRisk: "Medium",
      riskScore: 50,
      reviewStatus: "incomplete_unverified",
      summary: `Review Incomplete: ${unverifiedCount} candidate finding(s) returned by the AI could not be verified in the supplied excerpt. Because no findings could be verified, this document cannot be rated as safe or low risk. Please provide the full text or complete clauses to perform a verified review.`,
    };
  }

  let overallRisk: RiskLevel = "Low";
  let riskScore = 0;
  let reviewStatus: "complete" | "incomplete_unverified" | "clean" = "complete";

  if (unverifiedCount > 0) {
    reviewStatus = "incomplete_unverified";
  } else if (verifiedClauses.length === 0) {
    reviewStatus = "clean";
  } else {
    reviewStatus = "complete";
  }

  if (highCount >= 2) {
    overallRisk = "High";
    riskScore = Math.min(95, 75 + highCount * 5);
  } else if (highCount === 1) {
    overallRisk = "High";
    riskScore = 70;
  } else if (medCount >= 2) {
    overallRisk = "Medium";
    riskScore = 60;
  } else if (medCount === 1) {
    overallRisk = "Medium";
    riskScore = 40;
  } else if (verifiedClauses.length > 0) {
    overallRisk = "Low";
    riskScore = 20;
  }

  let summary = "";
  if (unverifiedCount > 0) {
    summary = `Partial Assessment: ${verifiedClauses.length} verified finding(s) confirmed in the text (${unverifiedCount} unverified AI finding(s) were excluded). This score reflects only the verified items and is not a complete contract assessment.`;
  } else if (verifiedClauses.length === 0) {
    summary = "Clean Review: No significant concerning terms or one-sided clauses were identified in the analyzed text.";
  } else {
    summary = typeof rawSummary === "string" && rawSummary.trim().length > 0 ? rawSummary.trim() : `This review identified ${verifiedClauses.length} verified clause concern(s) in the supplied text.`;
  }

  return { overallRisk, riskScore, reviewStatus, summary };
}

/**
 * Normalizes, validates, and sanitizes untrusted raw model output into a strictly-typed AnalysisResult.
 *
 * INTEGRITY ENFORCEMENTS:
 * 1. Checks that every clause quote exists verbatim in sourceText.
 * 2. Checks logical quote-to-explanation alignment.
 * 3. Excludes unverified or cross-contaminated findings without hallucinating replacements.
 * 4. Filters missing protections by document category relevance.
 * 5. Builds negotiation email strictly from verified findings.
 *
 * @param raw - The untrusted JSON payload.
 * @param sourceText - Original document text for verbatim matching.
 * @returns Fully validated and normalized AnalysisResult.
 */
export function normalizeAnalysisResult(raw: unknown, sourceText: string): AnalysisResult {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid model response structure: payload is not an object.");
  }

  const data = raw as RawAnalysisData;
  const supportedCategories = detectDocumentCategories(sourceText);
  const primaryCategory = supportedCategories[0] || "general";

  const rawClauses = Array.isArray(data.flaggedClauses) ? (data.flaggedClauses as RawFlaggedClause[]) : [];
  const { verifiedClauses, unverifiedCount } = verifyCandidateClauses(rawClauses, sourceText);

  const rawProtections = Array.isArray(data.missingProtections) ? (data.missingProtections as RawMissingProtection[]) : [];
  const verifiedProtections = filterCandidateProtections(rawProtections, supportedCategories);

  const { overallRisk, riskScore, reviewStatus, summary } = deriveNormalizedScore(
    verifiedClauses,
    unverifiedCount,
    data.summary
  );

  const negotiationEmail = buildNegotiationEmail(primaryCategory, verifiedClauses, verifiedProtections);

  return {
    overallRisk,
    riskScore,
    summary,
    flaggedClauses: verifiedClauses,
    missingProtections: verifiedProtections,
    negotiationEmail,
    unverifiedCount,
    hasSupportedFindings: verifiedClauses.length > 0,
    reviewStatus,
  };
}
