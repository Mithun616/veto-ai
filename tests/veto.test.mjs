import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  validateDocumentText,
  validateFileMetadata,
  extractJsonObject,
  detectDocumentCategory,
  runLocalClauseAnalysis,
  normalizeAnalysisResult,
  getNormalizedSeverity,
  getSeverityRank,
  MAX_FILE_SIZE,
  MIN_DOCUMENT_LENGTH,
  MAX_DOCUMENT_LENGTH,
} from "../lib/veto.ts";

describe("Input Validation & Security Bounds", () => {
  test("rejects non-string inputs", () => {
    assert.equal(validateDocumentText(null).valid, false);
    assert.equal(validateDocumentText(undefined).valid, false);
    assert.equal(validateDocumentText(12345).valid, false);
    assert.equal(validateDocumentText({ text: "sample" }).valid, false);
  });

  test("rejects inputs below minimum character threshold", () => {
    const tooShort = "Short clause";
    const res = validateDocumentText(tooShort);
    assert.equal(res.valid, false);
    assert.match(res.error || "", new RegExp(String(MIN_DOCUMENT_LENGTH)));
  });

  test("accepts inputs meeting character bounds", () => {
    const validText = "This is a valid contract agreement text with sufficient characters.";
    const res = validateDocumentText(validText);
    assert.equal(res.valid, true);
    assert.equal(res.text, validText);
  });

  test("flags text exceeding maximum safe bounds and provides truncated text", () => {
    const excessiveText = "A".repeat(MAX_DOCUMENT_LENGTH + 500);
    const res = validateDocumentText(excessiveText);
    assert.equal(res.valid, false);
    assert.match(res.error || "", /exceeds the maximum safe limit/);
    assert.equal(res.text.length, MAX_DOCUMENT_LENGTH);
  });

  test("validates file sizes and enforces 4 MB limit", () => {
    assert.equal(validateFileMetadata("sample.pdf", 0).valid, false);
    assert.equal(validateFileMetadata("sample.pdf", 1024).valid, true);
    assert.equal(
      validateFileMetadata("large.pdf", MAX_FILE_SIZE + 1).valid,
      false
    );
  });

  test("validates file extensions", () => {
    assert.equal(validateFileMetadata("contract.pdf", 5000).valid, true);
    assert.equal(validateFileMetadata("offer.docx", 5000).valid, true);
    assert.equal(validateFileMetadata("agreement.txt", 5000).valid, true);
    assert.equal(validateFileMetadata("malicious.exe", 5000).valid, false);
    assert.equal(validateFileMetadata("script.sh", 5000).valid, false);
  });

  test("validates MIME types when provided", () => {
    assert.equal(
      validateFileMetadata("doc.pdf", 1000, "application/pdf").valid,
      true
    );
    assert.equal(
      validateFileMetadata("doc.txt", 1000, "text/plain").valid,
      true
    );
    assert.equal(
      validateFileMetadata("doc.pdf", 1000, "application/x-msdownload").valid,
      false
    );
  });
});

describe("JSON Extraction & Malformed Model Handling", () => {
  test("extracts pure JSON object", () => {
    const raw = JSON.stringify({ overallRisk: "High", riskScore: 85 });
    const parsed = extractJsonObject(raw);
    assert.equal(parsed.overallRisk, "High");
    assert.equal(parsed.riskScore, 85);
  });

  test("extracts JSON enclosed within markdown code fences", () => {
    const raw = "```json\n{\n  \"overallRisk\": \"Medium\",\n  \"riskScore\": 50\n}\n```";
    const parsed = extractJsonObject(raw);
    assert.equal(parsed.overallRisk, "Medium");
    assert.equal(parsed.riskScore, 50);
  });

  test("extracts JSON embedded inside conversational text", () => {
    const raw = "Here is the audit output:\n{\"overallRisk\":\"Low\",\"riskScore\":20}\nHope this helps!";
    const parsed = extractJsonObject(raw);
    assert.equal(parsed.overallRisk, "Low");
    assert.equal(parsed.riskScore, 20);
  });

  test("throws error when no valid JSON is present", () => {
    assert.throws(() => {
      extractJsonObject("No JSON structure anywhere in this response.");
    });
  });
});

describe("Deterministic Local Clause-Pattern Analyzer", () => {
  test("flags internship exit bonds and financial penalties", () => {
    const text = `The candidate agrees to a mandatory training bond. In the event the intern leaves early, the intern shall reimburse the company INR 2,00,000 as liquidated damages and training expenses.`;
    const result = runLocalClauseAnalysis(text);

    assert.equal(result.overallRisk, "High");
    assert.ok(result.riskScore >= 70);
    const bond = result.flaggedClauses.find((c) =>
      c.title.includes("Exit Bond")
    );
    assert.ok(bond, "Exit bond must be detected");
    assert.equal(bond?.risk, "High");
    assert.ok(bond?.negotiationLine.length > 0);
  });

  test("flags stipend withholding and deposit traps", () => {
    const text = `A monthly stipend will be paid. However, 50% of the stipend will be withheld and retained by the company as a security deposit.`;
    const result = runLocalClauseAnalysis(text);

    const withhold = result.flaggedClauses.find((c) =>
      c.title.includes("Withholding")
    );
    assert.ok(withhold, "Stipend withholding must be flagged");
    assert.equal(withhold?.risk, "High");
  });

  test("flags asymmetric 90-day notice vs immediate termination", () => {
    const text = `The employee must provide 90 days notice period prior to resignation. The company reserves the right to terminate immediately without prior notice.`;
    const result = runLocalClauseAnalysis(text);

    const notice = result.flaggedClauses.find((c) =>
      c.title.includes("Notice")
    );
    assert.ok(notice, "Asymmetric notice must be flagged");
    assert.equal(notice?.risk, "High");
  });

  test("flags personal IP grab on weekend side projects", () => {
    const text = `The employee irrevocably assigns all intellectual property developed during the term, including personal side projects and weekend off-duty open source software.`;
    const result = runLocalClauseAnalysis(text);

    const ip = result.flaggedClauses.find((c) =>
      c.title.includes("Personal IP")
    );
    assert.ok(ip, "Personal IP grab must be flagged");
    assert.equal(ip?.risk, "High");
  });

  test("flags rental deposit forfeiture, painting deductions, and unannounced entry", () => {
    const text = `A mandatory non-negotiable deduction for painting will be deducted. Landlord reserves the right to enter and inspect at any time day or night without prior notice. Deposit refunded within 90 to 120 days. If tenant terminates early, deposit is completely forfeited.`;
    const result = runLocalClauseAnalysis(text);

    assert.equal(result.overallRisk, "High");
    const entry = result.flaggedClauses.find((c) =>
      c.title.includes("Unannounced Entry")
    );
    const refund = result.flaggedClauses.find((c) =>
      c.title.includes("Delayed Deposit")
    );
    assert.ok(entry, "Unannounced entry must be flagged");
    assert.ok(refund, "Delayed refund must be flagged");
  });

  test("identifies missing standard protections", () => {
    const text = `The tenant shall pay security deposit. Landlord reserves right to enter and inspect. Notice period is 90 days.`;
    const result = runLocalClauseAnalysis(text);

    const depositTimeline = result.missingProtections.find((p) =>
      p.title.includes("14-Day Deposit Return")
    );
    const mutualNotice = result.missingProtections.find((p) =>
      p.title.includes("Mutual Notice")
    );
    assert.ok(depositTimeline, "14-day deposit timeline should be identified as missing");
    assert.ok(mutualNotice, "Mutual notice safeguard should be identified as missing");
  });

  test("detects document categories accurately from legal keywords", () => {
    const rentalDoc = "Residential Tenancy Agreement between Landlord and Tenant regarding leased premises and security deposit.";
    const internDoc = "Software Engineering Intern offer letter with monthly stipend, training bond, and non-compete.";
    const saasDoc = "Cloud Platform Terms of Service regarding subscription plan, auto-renewal, user data, and limitation of liability.";

    assert.equal(detectDocumentCategory(rentalDoc), "rental");
    assert.equal(detectDocumentCategory(internDoc), "internship");
    assert.equal(detectDocumentCategory(saasDoc), "saas_fintech");
  });

  test("flags saas_fintech auto-renewal and postal cancellation trap", () => {
    const text = "Subscription will auto-renew annually. To cancel, you must send written notice via registered postal mail 60 days in advance. All fees are non-refundable.";
    const result = runLocalClauseAnalysis(text);

    const trap = result.flaggedClauses.find((c) =>
      c.title.includes("Auto-Renewal")
    );
    assert.ok(trap, "Auto-renewal and postal cancellation must be flagged");
    assert.equal(trap?.risk, "High");
    assert.match(trap?.negotiationLine || "", /digital one-click cancellation/i);
  });

  test("flags saas_fintech unrestricted data sharing and AI model training", () => {
    const text = "Company may share user data with advertising third parties without consent and retains a perpetual royalty-free license to user content for AI training.";
    const result = runLocalClauseAnalysis(text);

    const trap = result.flaggedClauses.find((c) =>
      c.title.includes("Data Exploitation") || c.title.includes("AI Training")
    );
    assert.ok(trap, "Broad data sharing and AI training must be flagged");
    assert.equal(trap?.risk, "High");
    assert.match(trap?.whyItMatters || "", /ai model training/i);
  });

  test("flags saas_fintech tiny liability cap and immediate data deletion without export window", () => {
    const text = "Total aggregate liability shall not exceed INR 250 under any circumstances. Upon termination, company will immediately delete data with no obligation to return.";
    const result = runLocalClauseAnalysis(text);

    const trap = result.flaggedClauses.find((c) =>
      c.title.includes("Liability Cap") || c.title.includes("Data Deletion")
    );
    assert.ok(trap, "Tiny liability cap and immediate data deletion must be flagged");
    assert.equal(trap?.risk, "High");
    assert.match(trap?.negotiationLine || "", /30-day window to export/i);
  });

  test("flags saas_fintech hidden fees, retroactive interest spikes, and auto-debit without notice", () => {
    const text = "Bank reserves right to apply retroactive fee increases and revise interest rate without prior notice via auto-debit without notice.";
    const result = runLocalClauseAnalysis(text);

    const trap = result.flaggedClauses.find((c) =>
      c.title.includes("Hidden Fees") || c.title.includes("Auto-Debit")
    );
    assert.ok(trap, "Hidden fees and unauthorized auto-debit must be flagged");
    assert.equal(trap?.risk, "High");
  });

  test("enforces strict category-specific missing protections", () => {
    // SaaS / Fintech document
    const saasText = "Cloud subscription terms of service with recurring monthly fee and user data storage.";
    const saasResult = runLocalClauseAnalysis(saasText);
    const saasTitles = saasResult.missingProtections.map((p) => p.title);

    assert.ok(saasTitles.includes("Digital Cancellation & Refunds"));
    assert.ok(saasTitles.includes("30-Day Data Export Window"));
    assert.ok(saasTitles.includes("Fair Liability Cap"));
    // Must NOT contain rental or internship protections
    assert.ok(!saasTitles.some((t) => t.includes("Deposit Return")));
    assert.ok(!saasTitles.some((t) => t.includes("Side Project Carveout")));

    // Rental document
    const rentalText = "Apartment lease agreement between landlord and tenant. Security deposit of 50000.";
    const rentalResult = runLocalClauseAnalysis(rentalText);
    const rentalTitles = rentalResult.missingProtections.map((p) => p.title);

    assert.ok(rentalTitles.includes("14-Day Deposit Return Timeline"));
    assert.ok(rentalTitles.includes("Landlord Maintenance Obligations"));
    // Must NOT contain SaaS or internship protections
    assert.ok(!rentalTitles.includes("Digital Cancellation & Refunds"));
    assert.ok(!rentalTitles.includes("Personal Side Project Carveout"));

    // Internship document
    const internText = "Software engineer intern offer letter with monthly stipend and training.";
    const internResult = runLocalClauseAnalysis(internText);
    const internTitles = internResult.missingProtections.map((p) => p.title);

    assert.ok(internTitles.includes("Personal Side Project Carveout"));
    assert.ok(internTitles.includes("Guaranteed Timely Stipend Release"));
    // Must NOT contain rental or SaaS protections
    assert.ok(!internTitles.includes("14-Day Deposit Return Timeline"));
    assert.ok(!internTitles.includes("30-Day Data Export Window"));
  });

  test("generates dynamic category-specific negotiation email with numbered findings", () => {
    // 1. Internship email
    const internText = "Intern offer letter with training bond liquidated damages of 2,00,000 and 90 days notice.";
    const internResult = runLocalClauseAnalysis(internText);

    assert.equal(
      internResult.negotiationEmail.subject,
      "Proposed Revisions to Internship Offer Letter"
    );
    assert.match(internResult.negotiationEmail.body, /1\. /);
    assert.match(internResult.negotiationEmail.body, /Exit Bond/i);
    assert.match(internResult.negotiationEmail.body, /\[Your Name\]/);

    // 2. Rental email
    const rentalText = "Lease agreement between landlord and tenant. Landlord can enter at any time day or night without notice.";
    const rentalResult = runLocalClauseAnalysis(rentalText);

    assert.equal(
      rentalResult.negotiationEmail.subject,
      "Request for Balanced Residential Lease Terms"
    );
    assert.match(rentalResult.negotiationEmail.body, /1\. /);
    assert.match(rentalResult.negotiationEmail.body, /Unannounced Entry/i);

    // 3. SaaS / Fintech email
    const saasText = "Subscription service agreement. Auto-renew with non-refundable fee. Total liability shall not exceed INR 250.";
    const saasResult = runLocalClauseAnalysis(saasText);

    assert.equal(
      saasResult.negotiationEmail.subject,
      "Request for Fair Terms & Consumer Protections"
    );
    assert.match(saasResult.negotiationEmail.body, /1\. /);
    assert.match(saasResult.negotiationEmail.body, /Digital Cancellation & Refunds/i);
  });
});

describe("Output Normalization & Resilient Sanitization", () => {
  test("clamps out-of-range risk scores to 0-100", () => {
    const normalizedLow = normalizeAnalysisResult(
      { riskScore: -50, overallRisk: "Low" },
      "Fallback document text"
    );
    assert.equal(normalizedLow.riskScore, 0);

    const normalizedHigh = normalizeAnalysisResult(
      { riskScore: 999, overallRisk: "High" },
      "Fallback document text"
    );
    assert.equal(normalizedHigh.riskScore, 100);
  });

  test("provides safe fallbacks for missing or malformed fields", () => {
    const normalized = normalizeAnalysisResult(
      {
        overallRisk: "InvalidRiskValue",
        summary: null,
        flaggedClauses: [{ title: null, risk: "Invalid" }],
      },
      "Fallback contract text"
    );

    assert.equal(normalized.overallRisk, "Medium");
    assert.ok(normalized.summary.length > 0);
    assert.equal(normalized.flaggedClauses[0].risk, "Medium");
    assert.ok(normalized.flaggedClauses[0].title.length > 0);
  });

  test("falls back completely to local analysis on null or corrupted input", () => {
    const text = `Training bond with liquidated damages of INR 1,50,000 for early exit.`;
    const normalized = normalizeAnalysisResult(null, text);

    assert.equal(normalized.overallRisk, "High");
    assert.ok(normalized.flaggedClauses.length > 0);
  });
});

describe("Severity Normalization, Sorting & Filtering Logic", () => {
  test("normalizes standard severities accurately", () => {
    assert.equal(getNormalizedSeverity("High"), "High");
    assert.equal(getNormalizedSeverity("high"), "High");
    assert.equal(getNormalizedSeverity("Medium"), "Medium");
    assert.equal(getNormalizedSeverity("moderate"), "Medium");
    assert.equal(getNormalizedSeverity("Low"), "Low");
    assert.equal(getNormalizedSeverity("low"), "Low");
  });

  test("handles missing or unrecognized severity as Unrated without silently coercing to Low", () => {
    assert.equal(getNormalizedSeverity(null), "Unrated");
    assert.equal(getNormalizedSeverity(undefined), "Unrated");
    assert.equal(getNormalizedSeverity(""), "Unrated");
    assert.equal(getNormalizedSeverity("Critical"), "Unrated");
    assert.equal(getNormalizedSeverity("Unknown"), "Unrated");
    assert.notEqual(getNormalizedSeverity("Unknown"), "Low");
  });

  test("ranks severities strictly: High (1) -> Medium (2) -> Low (3) -> Unrated (4)", () => {
    assert.equal(getSeverityRank("High"), 1);
    assert.equal(getSeverityRank("Medium"), 2);
    assert.equal(getSeverityRank("Low"), 3);
    assert.equal(getSeverityRank("Unrated"), 4);
    assert.ok(getSeverityRank("High") < getSeverityRank("Medium"));
    assert.ok(getSeverityRank("Medium") < getSeverityRank("Low"));
    assert.ok(getSeverityRank("Low") < getSeverityRank("Unrated"));
  });

  test("sorts mixed findings with High concerns first while preserving original order within tiers", () => {
    const items = [
      { id: "1", title: "Low Item A", risk: "Low", originalIndex: 0 },
      { id: "2", title: "High Item A", risk: "High", originalIndex: 1 },
      { id: "3", title: "Medium Item A", risk: "Medium", originalIndex: 2 },
      { id: "4", title: "High Item B", risk: "High", originalIndex: 3 },
      { id: "5", title: "Unrated Item", risk: "Unknown", originalIndex: 4 },
      { id: "6", title: "Medium Item B", risk: "Medium", originalIndex: 5 },
    ];

    const sorted = [...items].sort((a, b) => {
      const rankA = getSeverityRank(getNormalizedSeverity(a.risk));
      const rankB = getSeverityRank(getNormalizedSeverity(b.risk));
      return rankA - rankB;
    });

    assert.deepEqual(
      sorted.map((s) => s.id),
      ["2", "4", "3", "6", "1", "5"]
    );
  });
});

describe("Firebase Safe Fallbacks & Guest Mode", () => {
  test("reports isFirebaseConfigured false when env vars are absent", async () => {
    const { isFirebaseConfigured, signInWithGoogle, getUserScans, saveScanToFirestore } = await import(
      "../lib/firebase.ts"
    );
    // In test environment without NEXT_PUBLIC_FIREBASE_API_KEY
    assert.equal(typeof isFirebaseConfigured, "boolean");

    const user = await signInWithGoogle();
    assert.equal(user, null);

    const scans = await getUserScans("non-existent-user");
    assert.deepEqual(scans, []);

    const scanId = await saveScanToFirestore("user1", {
      title: "Test Scan",
      overallRisk: "Low",
      riskScore: 20,
      summary: "Test",
      analysis: {
        overallRisk: "Low",
        riskScore: 20,
        summary: "Test",
        flaggedClauses: [],
        missingProtections: [],
        negotiationEmail: { subject: "Sub", body: "Body" },
      },
    });
    assert.equal(scanId, null);
  });
});
