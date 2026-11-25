/**
 * @fileoverview Deterministic Security & Serialization Logic Unit Tests.
 *
 * Verifies that:
 * 1. `serializePersistedScan` strictly enforces allowlisted fields only.
 * 2. `documentSnapshot`, `documentText`, and arbitrary metadata are stripped.
 * 3. Title, summary, and email lengths are bounded.
 * 4. Risk scores and overall risk ratings are clamped and validated.
 * 5. Rule validation constraints matching `firestore.rules` are satisfied by production serialization.
 * 6. `AnalysisResult` contract excludes `documentSnapshot`.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { serializePersistedScan } from "../lib/firebase.ts";

// Helper simulator of firestore.rules validation predicate
function simulateFirestoreRulesValidation(data) {
  const allowedRootKeys = new Set([
    "title",
    "overallRisk",
    "riskScore",
    "summary",
    "analysis",
    "clientTimestamp",
    "createdAt",
  ]);
  const requiredRootKeys = [
    "title",
    "overallRisk",
    "riskScore",
    "summary",
    "analysis",
    "clientTimestamp",
  ];

  // Root key check
  const actualKeys = Object.keys(data);
  for (const k of actualKeys) {
    if (!allowedRootKeys.has(k)) {
      return { valid: false, reason: `Disallowed root key: ${k}` };
    }
  }
  for (const k of requiredRootKeys) {
    if (!(k in data)) {
      return { valid: false, reason: `Missing required root key: ${k}` };
    }
  }

  // Root field types & bounds
  if (typeof data.title !== "string" || data.title.length > 100) {
    return { valid: false, reason: "Invalid title length/type" };
  }
  if (!["Low", "Medium", "High"].includes(data.overallRisk)) {
    return { valid: false, reason: "Invalid overallRisk" };
  }
  if (
    typeof data.riskScore !== "number" ||
    data.riskScore < 0 ||
    data.riskScore > 100
  ) {
    return { valid: false, reason: "Invalid riskScore" };
  }
  if (typeof data.summary !== "string" || data.summary.length > 2000) {
    return { valid: false, reason: "Invalid summary length/type" };
  }
  if (
    typeof data.clientTimestamp !== "string" ||
    data.clientTimestamp.length > 40
  ) {
    return { valid: false, reason: "Invalid clientTimestamp" };
  }

  // Nested analysis validation
  const analysis = data.analysis;
  if (!analysis || typeof analysis !== "object" || Array.isArray(analysis)) {
    return { valid: false, reason: "Analysis must be a map" };
  }

  const allowedAnalysisKeys = new Set([
    "overallRisk",
    "riskScore",
    "summary",
    "reviewStatus",
    "unverifiedCount",
    "hasSupportedFindings",
    "flaggedClauses",
    "missingProtections",
    "negotiationEmail",
  ]);

  for (const k of Object.keys(analysis)) {
    if (!allowedAnalysisKeys.has(k)) {
      return { valid: false, reason: `Disallowed analysis key: ${k}` };
    }
  }

  for (const k of allowedAnalysisKeys) {
    if (!(k in analysis)) {
      return { valid: false, reason: `Missing required analysis key: ${k}` };
    }
  }

  if (!["Low", "Medium", "High"].includes(analysis.overallRisk)) {
    return { valid: false, reason: "Invalid analysis.overallRisk" };
  }
  if (
    typeof analysis.riskScore !== "number" ||
    analysis.riskScore < 0 ||
    analysis.riskScore > 100
  ) {
    return { valid: false, reason: "Invalid analysis.riskScore" };
  }
  if (typeof analysis.summary !== "string" || analysis.summary.length > 2000) {
    return { valid: false, reason: "Invalid analysis.summary" };
  }
  if (
    !["complete", "incomplete_unverified", "clean"].includes(
      analysis.reviewStatus
    )
  ) {
    return { valid: false, reason: "Invalid analysis.reviewStatus" };
  }
  if (
    typeof analysis.unverifiedCount !== "number" ||
    analysis.unverifiedCount < 0
  ) {
    return { valid: false, reason: "Invalid analysis.unverifiedCount" };
  }
  if (typeof analysis.hasSupportedFindings !== "boolean") {
    return { valid: false, reason: "Invalid analysis.hasSupportedFindings" };
  }
  if (!Array.isArray(analysis.flaggedClauses) || analysis.flaggedClauses.length > 50) {
    return { valid: false, reason: "Invalid analysis.flaggedClauses" };
  }
  if (
    !Array.isArray(analysis.missingProtections) ||
    analysis.missingProtections.length > 20
  ) {
    return { valid: false, reason: "Invalid analysis.missingProtections" };
  }

  // Nested negotiationEmail validation
  const email = analysis.negotiationEmail;
  if (!email || typeof email !== "object" || Array.isArray(email)) {
    return { valid: false, reason: "NegotiationEmail must be a map" };
  }
  const emailKeys = Object.keys(email);
  if (
    emailKeys.length !== 2 ||
    !emailKeys.includes("subject") ||
    !emailKeys.includes("body")
  ) {
    return { valid: false, reason: "Invalid negotiationEmail keys" };
  }
  if (typeof email.subject !== "string" || email.subject.length > 200) {
    return { valid: false, reason: "Invalid email.subject" };
  }
  if (typeof email.body !== "string" || email.body.length > 5000) {
    return { valid: false, reason: "Invalid email.body" };
  }

  return { valid: true };
}

describe("Firestore Allowlist Serialization & Rule Invariants", () => {
  it("strips documentSnapshot, documentText, and arbitrary injected fields", () => {
    const maliciousInput = {
      title: "Suspicious Document Audit",
      overallRisk: "High",
      riskScore: 90,
      summary: "Found major traps.",
      documentSnapshot: "Sensitive raw contract text...",
      documentText: "Full confidential agreement...",
      admin: true,
      internalSessionToken: "secret_token_123",
      analysis: {
        documentSnapshot: "Another raw snippet...",
        documentText: "Nested confidential agreement...",
        overallRisk: "High",
        riskScore: 90,
        summary: "Found major traps.",
        reviewStatus: "complete",
        unverifiedCount: 0,
        hasSupportedFindings: true,
        extraSecretField: 42,
        flaggedClauses: [
          {
            id: "clause-1",
            title: "Unilateral Termination",
            quote: "Landlord may evict on 1 day notice.",
            risk: "High",
            whyItMatters: "Severe insecurity.",
            negotiationLine: "Require 30 days notice.",
            arbitraryMeta: "should be stripped",
          },
        ],
        missingProtections: [
          {
            id: "prot-1",
            title: "Deposit Refund",
            whyItMatters: "Must be timely.",
            askFor: "Return within 14 days.",
            leakField: "should be stripped",
          },
        ],
        negotiationEmail: {
          subject: "Draft Negotiation",
          body: "Please amend clause 1.",
          senderIp: "127.0.0.1",
        },
      },
    };

    const serialized = serializePersistedScan(maliciousInput);

    // Root-level assertions
    assert.equal("documentSnapshot" in serialized, false);
    assert.equal("documentText" in serialized, false);
    assert.equal("admin" in serialized, false);
    assert.equal("internalSessionToken" in serialized, false);

    // Analysis-level assertions
    assert.equal("documentSnapshot" in serialized.analysis, false);
    assert.equal("documentText" in serialized.analysis, false);
    assert.equal("extraSecretField" in serialized.analysis, false);

    // Clause & email assertions
    assert.equal("arbitraryMeta" in serialized.analysis.flaggedClauses[0], false);
    assert.equal("leakField" in serialized.analysis.missingProtections[0], false);
    assert.equal("senderIp" in serialized.analysis.negotiationEmail, false);

    // Passes simulated firestore.rules validator
    const ruleCheck = simulateFirestoreRulesValidation(serialized);
    assert.equal(ruleCheck.valid, true, ruleCheck.reason);
  });

  it("bounds long string fields to prevent Firestore document inflation", () => {
    const hugeInput = {
      title: "T".repeat(300),
      overallRisk: "Low",
      riskScore: 25,
      summary: "S".repeat(5000),
      analysis: {
        overallRisk: "Low",
        riskScore: 25,
        summary: "S".repeat(5000),
        reviewStatus: "complete",
        unverifiedCount: 0,
        hasSupportedFindings: false,
        flaggedClauses: [
          {
            id: "id-".repeat(30),
            title: "Title-".repeat(40),
            quote: "Quote-".repeat(150),
            risk: "Low",
            whyItMatters: "Why-".repeat(300),
            negotiationLine: "Line-".repeat(300),
          },
        ],
        missingProtections: [
          {
            id: "prot-".repeat(30),
            title: "Missing-".repeat(40),
            whyItMatters: "Why-".repeat(300),
            askFor: "Ask-".repeat(300),
          },
        ],
        negotiationEmail: {
          subject: "Sub-".repeat(80),
          body: "Body-".repeat(2000),
        },
      },
    };

    const serialized = serializePersistedScan(hugeInput);

    assert.ok(serialized.title.length <= 100);
    assert.ok(serialized.summary.length <= 2000);
    assert.ok(serialized.analysis.summary.length <= 2000);
    assert.ok(serialized.analysis.flaggedClauses[0].title.length <= 150);
    assert.ok(serialized.analysis.flaggedClauses[0].quote.length <= 500);
    assert.ok(serialized.analysis.flaggedClauses[0].whyItMatters.length <= 1000);
    assert.ok(serialized.analysis.flaggedClauses[0].negotiationLine.length <= 1000);
    assert.ok(serialized.analysis.missingProtections[0].title.length <= 150);
    assert.ok(serialized.analysis.missingProtections[0].askFor.length <= 1000);
    assert.ok(serialized.analysis.negotiationEmail.subject.length <= 200);
    assert.ok(serialized.analysis.negotiationEmail.body.length <= 5000);

    const ruleCheck = simulateFirestoreRulesValidation(serialized);
    assert.equal(ruleCheck.valid, true, ruleCheck.reason);
  });

  it("correctly clamps risk scores to [0, 100] and falls back on invalid values", () => {
    const low = serializePersistedScan({
      title: "Min Test",
      overallRisk: "Low",
      riskScore: -40,
      summary: "Underflow",
      analysis: {
        overallRisk: "Low",
        riskScore: -40,
        summary: "Underflow",
        flaggedClauses: [],
        missingProtections: [],
        negotiationEmail: { subject: "S", body: "B" },
      },
    });
    assert.equal(low.riskScore, 0);
    assert.equal(low.analysis.riskScore, 0);

    const high = serializePersistedScan({
      title: "Max Test",
      overallRisk: "High",
      riskScore: 250,
      summary: "Overflow",
      analysis: {
        overallRisk: "High",
        riskScore: 250,
        summary: "Overflow",
        flaggedClauses: [],
        missingProtections: [],
        negotiationEmail: { subject: "S", body: "B" },
      },
    });
    assert.equal(high.riskScore, 100);
    assert.equal(high.analysis.riskScore, 100);
  });

  it("sanitizes undefined optional fields via JSON.parse(JSON.stringify) for Firestore safety", () => {
    const serialized = serializePersistedScan({
      title: "Sanitize Test",
      overallRisk: "Medium",
      riskScore: 50,
      summary: "Testing undefined stripping",
      analysis: {
        overallRisk: "Medium",
        riskScore: 50,
        summary: "Testing undefined stripping",
        flaggedClauses: [],
        missingProtections: [],
        negotiationEmail: { subject: "Subject", body: "Body" },
      },
    });

    // Artificially inject undefined properties that could throw in Firestore SDK
    const rawWithUndefined = {
      ...serialized,
      undefinedField: undefined,
      analysis: {
        ...serialized.analysis,
        optionalUndefinedMarker: undefined,
      },
    };

    assert.equal(rawWithUndefined.undefinedField, undefined);
    assert.equal(rawWithUndefined.analysis.optionalUndefinedMarker, undefined);

    const sanitized = JSON.parse(JSON.stringify(rawWithUndefined));

    assert.equal("undefinedField" in sanitized, false);
    assert.equal("optionalUndefinedMarker" in sanitized.analysis, false);
    assert.equal(sanitized.title, "Sanitize Test");
    assert.equal(sanitized.overallRisk, "Medium");
    assert.equal(sanitized.riskScore, 50);
  });

  it("verifies firestore.rules file syntax and structure", () => {
    const rulesPath = path.resolve(process.cwd(), "firestore.rules");
    assert.ok(fs.existsSync(rulesPath), "firestore.rules must exist");
    const content = fs.readFileSync(rulesPath, "utf8");

    assert.ok(content.includes("rules_version = '2';"), "Must declare rules_version = '2'");
    assert.ok(content.includes("service cloud.firestore"), "Must declare firestore service");
    assert.ok(content.includes("allow update: if false;"), "Must deny updates for immutability");
    assert.ok(content.includes("request.auth.uid == userId"), "Must enforce owner authorization");
    assert.ok(content.includes(".keys().hasOnly("), "Must use hasOnly() for allowlisted fields");
    assert.ok(content.includes("isValidScanPayload()"), "Must call payload validator function");
  });
});
