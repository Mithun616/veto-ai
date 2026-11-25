/**
 * @fileoverview Deterministic negotiation counter-proposal email generator.
 * Builds polite, numbered negotiation drafts from verified findings and missing protections.
 */

import type {
  DocumentCategory,
  FlaggedClause,
  MissingProtection,
  NegotiationEmail,
} from "./veto-types.ts";

/**
 * Returns category-specific subject lines and polite opening paragraphs.
 *
 * @param category - Detected agreement type.
 * @returns Subject and opening message.
 */
function getEmailHeader(category: DocumentCategory): {
  subject: string;
  opening: string;
} {
  switch (category) {
    case "internship":
      return {
        subject: "Proposed Revisions to Internship Offer Letter",
        opening:
          "Thank you for extending this internship offer. I am genuinely excited about the role and contributing to the team. Before signing, I reviewed the agreement terms and would appreciate discussing a few adjustments to ensure standard, balanced terms:",
      };
    case "rental":
      return {
        subject: "Request for Balanced Residential Lease Terms",
        opening:
          "Thank you for sharing the tenancy agreement. I look forward to the tenancy. Before finalizing, I reviewed the agreement and would like to propose a few standard adjustments to ensure fair and balanced terms for both parties:",
      };
    case "saas_fintech":
      return {
        subject: "Request for Fair Terms & Consumer Protections",
        opening:
          "Thank you for providing the service agreement. Before proceeding, I reviewed the terms of service and would appreciate addressing a few clauses to ensure fair consumer protections and balanced obligations:",
      };
    case "general":
    default:
      return {
        subject: "Discussion Regarding Proposed Agreement Terms",
        opening:
          "Thank you for sharing the agreement for review. Before signing, I have reviewed the terms and would like to propose a few constructive adjustments to ensure the agreement is balanced and standard for both parties:",
      };
  }
}

/**
 * Formats verified clauses and missing protections into a numbered list.
 *
 * @param verifiedClauses - Validated flagged clauses from the document.
 * @param missingProtections - Recommended contextual protections omitted from the text.
 * @returns Formatted numbered text list.
 */
function formatEmailItems(
  verifiedClauses: FlaggedClause[],
  missingProtections: MissingProtection[]
): string {
  const items: string[] = [];
  verifiedClauses.forEach((c) => {
    items.push(`${c.title}: "${c.negotiationLine}"`);
  });
  missingProtections.forEach((p) => {
    items.push(`${p.title}: "${p.askFor}"`);
  });

  if (items.length === 0) {
    return "I have reviewed the agreement and would like to schedule a brief time to confirm mutual terms.";
  }
  return items.map((item, idx) => `${idx + 1}. ${item}`).join("\n\n");
}

/**
 * Assembles a diplomatic, numbered negotiation email deterministically from verified findings.
 * Guarantees that every point in the email corresponds directly to a verified clause
 * or contextual missing protection.
 *
 * @param category - Detected document category.
 * @param verifiedClauses - Verified clauses with evidence in the source text.
 * @param missingProtections - Contextual protections absent from the document.
 * @param userName - Optional name for the sign-off.
 * @returns Complete NegotiationEmail object with subject and body.
 */
export function buildNegotiationEmail(
  category: DocumentCategory,
  verifiedClauses: FlaggedClause[],
  missingProtections: MissingProtection[],
  userName?: string | null
): NegotiationEmail {
  const { subject, opening } = getEmailHeader(category);
  const numberedList = formatEmailItems(verifiedClauses, missingProtections);
  const signatureName =
    userName && userName.trim() ? userName.trim() : "[Your Name]";

  const body = `Hello,\n\n${opening}\n\n${numberedList}\n\nCould we discuss these points and incorporate these adjustments into the final agreement? I would be glad to hop on a quick call or review an updated draft at your convenience.\n\nThank you for your time and understanding.\n\nBest regards,\n${signatureName}`;

  return { subject, body };
}
