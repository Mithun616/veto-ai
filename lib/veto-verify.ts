/**
 * @fileoverview Source verification and semantic alignment heuristics for VetoAI.
 * Validates that candidate findings are verbatim matches in source documents
 * and that cited excerpts are contextually aligned with generated explanations.
 */

/**
 * Normalizes text conservatively for exact source matching:
 * replaces smart quotes/apostrophes, unifies dashes, collapses whitespace,
 * and converts to lowercase.
 *
 * @param text - Raw document or quote string.
 * @returns Clean normalized string suitable for substring search.
 */
export function normalizeForSourceMatching(text: string): string {
  if (!text || typeof text !== "string") return "";
  return text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\r\n/g, "\n")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * Strips leading and trailing quotation marks and ellipses before matching.
 *
 * @param rawQuote - Raw extracted quote string.
 * @returns Clean quote text without enclosing punctuation.
 */
export function cleanQuoteForVerification(rawQuote: string): string {
  if (!rawQuote || typeof rawQuote !== "string") return "";
  return rawQuote
    .trim()
    .replace(/^["'“”‘«»\s]+|["'“”’»\s]+$/g, "")
    .replace(/^\.{3,}|\.{3,}$/g, "")
    .trim();
}

/**
 * Verifies that a proposed quote appears verbatim in the source document.
 * Handles ellipsis ('...') by verifying that each part appears in sequence.
 * Requires at least 10 normalized characters to prevent trivial matches.
 *
 * @param quote - Candidate excerpt to verify.
 * @param sourceText - Original full document text.
 * @returns True if quote exists verbatim in sourceText.
 */
export function verifySourceQuote(quote: string, sourceText: string): boolean {
  if (!quote || typeof quote !== "string" || !sourceText || typeof sourceText !== "string") {
    return false;
  }
  const cleanQuote = cleanQuoteForVerification(quote);
  const normQuote = normalizeForSourceMatching(cleanQuote);
  if (normQuote.length < 10) return false;

  const normSource = normalizeForSourceMatching(sourceText);

  if (normQuote.includes("...")) {
    const parts = normQuote
      .split("...")
      .map((p) => p.trim())
      .filter((p) => p.length >= 6);
    if (parts.length === 0) return false;

    let lastIndex = 0;
    for (const part of parts) {
      const idx = normSource.indexOf(part, lastIndex);
      if (idx === -1) return false;
      lastIndex = idx + part.length;
    }
    return true;
  }

  return normSource.includes(normQuote);
}

/**
 * Checks for obvious cross-domain topic mismatches between a quote and explanation.
 */
function hasCrossDomainMismatch(q: string, exp: string): boolean {
  const hasRate = /\b(interest rates?|rate of interest|credit limits?|card fees?|banking charges?|convenience fees?|processing fees?|fees?|charges?|apr|emi)\b/i.test(q);
  const hasTerm = /\b(terminate|termination|resign|resignation|vacate|eviction|separation)\b/i.test(q);
  if (hasRate && !hasTerm && /\b(notice|notice period|asymmetric notice|one-sided notice|mutual notice|resignation|resigning|landlord|evict|vacate|tenancy|training bond)\b/i.test(exp)) {
    return true;
  }

  const hasRental = /\b(landlord|tenant|premises|security deposit|painting|flat|apartment|lease)\b/i.test(q);
  const hasInternOrSaas = /\b(intern|stipend|training bond|software|ai training|data export)\b/i.test(q);
  if (hasRental && !hasInternOrSaas && /\b(training bond|internship|stipend|ai training|data export|subscription cancellation)\b/i.test(exp)) {
    return true;
  }

  const hasEmployment = /\b(intern|internship|training bond|stipend|liquidated damages|side project|non-compete)\b/i.test(q);
  const hasRentalOrBank = /\b(landlord|tenant|premises|security deposit|interest rate|bank)\b/i.test(q);
  if (hasEmployment && !hasRentalOrBank && /\b(landlord|tenant|premises|interest rate|banking|credit limit)\b/i.test(exp)) {
    return true;
  }

  return false;
}

/**
 * Checks for intra-domain semantic mismatches (e.g. rate quotes paired with privacy breaches).
 */
function hasIntraDomainMismatch(q: string, exp: string): boolean {
  const hasRate = /\b(interest rates?|credit limits?|fees?|charges?|apr|emi)\b/i.test(q);
  const hasDataQuote = /\b(data|privacy|personal information|user information|share data|sell data|third parties)\b/i.test(q);
  if (hasRate && !hasDataQuote && /\b(share personal data|sharing personal data|sell personal data|selling data|advertising third parties|privacy breach|user tracking|data monetization|track user behavior)\b/i.test(exp)) {
    return true;
  }

  const hasDataWordInQuote = /\b(user data|personal data|privacy policy|share information|ai training|data collection)\b/i.test(q);
  if (hasDataWordInQuote && !hasRate && /\b(interest rates?|fee increase|annual percentage rate|late fee penalty|billing spike|unilateral rate increase)\b/i.test(exp)) {
    return true;
  }

  return false;
}

/**
 * Heuristic mismatch check that screens for topical disconnects between the cited quote
 * and the generated explanation.
 *
 * Integrity Disclosure:
 * This is a keyword/category heuristic mismatch check, NOT proof of deep legal reasoning.
 * It catches gross cross-domain and intra-domain hallucinations before findings reach the UI.
 *
 * @param quote - Source quote excerpt.
 * @param title - Candidate finding title.
 * @param whyItMatters - Candidate explanation of why the clause is unfair.
 * @returns True if quote and explanation appear semantically aligned.
 */
export function isEvidenceAligned(quote: string, title: string, whyItMatters: string): boolean {
  const q = quote.toLowerCase();
  const exp = `${title} ${whyItMatters}`.toLowerCase();

  if (hasCrossDomainMismatch(q, exp)) return false;
  if (hasIntraDomainMismatch(q, exp)) return false;

  return true;
}
