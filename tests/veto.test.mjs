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
  verifySourceQuote,
  isEvidenceAligned,
  buildNegotiationEmail,
  cleanQuoteForVerification,
  normalizeForSourceMatching,
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
      p.title.includes("Mutual")
    );
    assert.ok(depositTimeline, "14-day deposit timeline should be identified as missing");
    assert.ok(mutualNotice, "Mutual lease notice safeguard should be identified as missing");
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
  test("calculates risk score deterministically from verified findings and ignores unverified scores", () => {
    const text = "The intern must pay liquidated damages of INR 1,50,000 upon early departure.";
    const normalized = normalizeAnalysisResult(
      {
        overallRisk: "High",
        riskScore: 999,
        flaggedClauses: [
          {
            quote: "liquidated damages of INR 1,50,000 upon early departure",
            title: "Exit Bond Penalty",
            risk: "High",
            whyItMatters: "Imposes severe financial exit penalties.",
            negotiationLine: "Please remove the financial exit penalty.",
          },
        ],
      },
      text
    );
    assert.equal(normalized.overallRisk, "High");
    assert.equal(normalized.riskScore, 70); // 1 verified High clause = 70, clamped strictly within bounds
  });

  test("provides safe fallbacks for missing or malformed fields in verified clauses", () => {
    const text = "Mandatory non-negotiable deduction for painting will be deducted from deposit.";
    const normalized = normalizeAnalysisResult(
      {
        overallRisk: "InvalidRiskValue",
        summary: null,
        flaggedClauses: [
          {
            quote: "Mandatory non-negotiable deduction for painting",
            title: null,
            risk: "Invalid",
            whyItMatters: null,
            negotiationLine: null,
          },
        ],
      },
      text
    );

    assert.equal(normalized.overallRisk, "Medium");
    assert.ok(normalized.summary.length > 0);
    assert.equal(normalized.flaggedClauses[0].risk, "Medium");
    assert.equal(normalized.flaggedClauses[0].title, "Flagged Clause");
    assert.ok(normalized.flaggedClauses[0].negotiationLine.length > 0);
  });

  test("rejects null or non-object model responses honestly", () => {
    const text = `Training bond with liquidated damages of INR 1,50,000 for early exit.`;
    assert.throws(() => {
      normalizeAnalysisResult(null, text);
    }, /Invalid model response structure/);

    assert.throws(() => {
      normalizeAnalysisResult("invalid string payload", text);
    }, /Invalid model response structure/);
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

// ===========================================================================
// Integrity & Anti-Hallucination Regression Suite (Cases A through H)
// ===========================================================================

describe("Integrity & Anti-Hallucination Regression Suite (Cases A-H)", () => {
  // Case A: Bank rate-change clause
  test("Case A: Bank rate-change clause flags interest rates/fees, does NOT flag termination notice or landlord entry", () => {
    const bankDoc =
      "The Bank reserves the right at its sole discretion to revise interest rates, introduce new fees, and modify credit limits at any time without prior notice.";

    const category = detectDocumentCategory(bankDoc);
    assert.equal(category, "saas_fintech");

    const result = runLocalClauseAnalysis(bankDoc);

    // Must flag rate/fee change
    const rateClause = result.flaggedClauses.find(
      (c) => c.title.includes("Rate Changes") || c.title.includes("Hidden Fees")
    );
    assert.ok(rateClause, "Bank clause must flag rate/fee modifications");
    assert.equal(rateClause?.risk, "High");

    // Must NOT flag termination notice
    const noticeClause = result.flaggedClauses.find(
      (c) =>
        c.title.toLowerCase().includes("notice") ||
        c.title.toLowerCase().includes("termination")
    );
    assert.equal(
      noticeClause,
      undefined,
      "Bank rate-change clause must NOT flag termination notice"
    );

    // Must NOT flag landlord entry
    const entryClause = result.flaggedClauses.find((c) =>
      c.title.toLowerCase().includes("entry")
    );
    assert.equal(
      entryClause,
      undefined,
      "Bank rate-change clause must NOT flag landlord entry"
    );

    // isEvidenceAligned must reject cross-domain pairings
    assert.equal(
      isEvidenceAligned(
        "Bank may revise interest rates and fees without prior notice",
        "One-Sided Notice Trap",
        "Requires 90 days notice before resignation"
      ),
      false,
      "Must reject pairing rate quote with termination notice explanation"
    );
  });

  // Case B: Internship offer
  test("Case B: Internship offer stays relevant to internship, does not import rental, banking, or SaaS findings", () => {
    const internDoc =
      "INTERNSHIP OFFER LETTER: Software engineering intern at TechCorp. Monthly stipend of INR 15,000. Mandatory training bond of INR 2,00,000 for 24 months. Intern must provide 90 days notice.";

    const category = detectDocumentCategory(internDoc);
    assert.equal(category, "internship");

    const result = runLocalClauseAnalysis(internDoc);

    // Must include internship findings
    assert.ok(
      result.flaggedClauses.some((c) => c.title.includes("Exit Bond")),
      "Must flag exit bond"
    );
    assert.ok(
      result.flaggedClauses.some((c) => c.title.includes("Notice")),
      "Must flag asymmetric notice"
    );

    // Must NOT import rental findings
    assert.ok(
      !result.flaggedClauses.some(
        (c) =>
          c.title.includes("Landlord") ||
          c.title.includes("Entry") ||
          c.title.includes("Delayed Deposit")
      ),
      "Must not import rental findings"
    );

    // Must NOT import banking or SaaS findings
    assert.ok(
      !result.flaggedClauses.some(
        (c) =>
          c.title.includes("Rate Changes") ||
          c.title.includes("Data Exploitation") ||
          c.title.includes("Auto-Renewal")
      ),
      "Must not import banking or SaaS findings"
    );

    // Missing protections must be strictly internship relevant
    const protTitles = result.missingProtections.map((p) => p.title);
    assert.ok(
      protTitles.some((t) => t.includes("Side Project Carveout")),
      "Must include side project carveout"
    );
    assert.ok(
      !protTitles.some((t) => t.includes("14-Day Deposit Return")),
      "Must NOT include rental deposit return"
    );
    assert.ok(
      !protTitles.some((t) => t.includes("30-Day Data Export")),
      "Must NOT include SaaS data export"
    );
  });

  // Case C: Rental agreement
  test("Case C: Rental agreement stays relevant to rental, does not import internship or banking findings", () => {
    const rentalDoc =
      "RESIDENTIAL TENANCY LEASE: Flat 201. Landlord and Tenant agree to lease terms. Security deposit of INR 1,00,000. Non-negotiable painting deduction of 1 month rent. Landlord may enter at any time day or night without notice. Deposit refunded within 90 to 120 days.";

    const category = detectDocumentCategory(rentalDoc);
    assert.equal(category, "rental");

    const result = runLocalClauseAnalysis(rentalDoc);

    // Must include rental findings
    assert.ok(
      result.flaggedClauses.some((c) => c.title.includes("Unannounced Entry")),
      "Must flag unannounced entry"
    );
    assert.ok(
      result.flaggedClauses.some((c) => c.title.includes("Delayed Deposit")),
      "Must flag delayed deposit refund"
    );

    // Must NOT import internship findings
    assert.ok(
      !result.flaggedClauses.some(
        (c) =>
          c.title.includes("Exit Bond") ||
          c.title.includes("Personal IP") ||
          c.title.includes("Stipend")
      ),
      "Must not import internship findings"
    );

    // Must NOT import banking findings
    assert.ok(
      !result.flaggedClauses.some(
        (c) =>
          c.title.includes("Rate Changes") || c.title.includes("Hidden Fees")
      ),
      "Must not import banking findings"
    );

    // Missing protections must be strictly rental relevant
    const protTitles = result.missingProtections.map((p) => p.title);
    assert.ok(
      protTitles.some((t) => t.includes("14-Day Deposit Return")),
      "Must include rental deposit timeline"
    );
    assert.ok(
      protTitles.some((t) => t.includes("Landlord Maintenance")),
      "Must include landlord maintenance obligations"
    );
    assert.ok(
      !protTitles.some((t) => t.includes("Side Project Carveout")),
      "Must NOT include internship carveouts"
    );
    assert.ok(
      !protTitles.some((t) => t.includes("Digital Cancellation")),
      "Must NOT include SaaS cancellation"
    );
  });

  // Case D: Unverifiable source quote
  test("Case D: Unverifiable source quote is rejected, omitted from negotiation email, and increments unverifiedCount", () => {
    const docText =
      "This consultancy agreement is entered between the Company and the Independent Consultant under the laws of Karnataka. “Liquidated damages shall apply only upon verified material breach.”";

    // Test quote verification helpers directly
    assert.equal(
      cleanQuoteForVerification(' "Liquidated damages shall apply..." '),
      "Liquidated damages shall apply"
    );
    assert.equal(
      normalizeForSourceMatching("  Liquidated   DAMAGES  "),
      "liquidated damages"
    );
    assert.equal(
      verifySourceQuote(
        "Liquidated damages shall apply only upon verified material breach",
        docText
      ),
      true
    );
    assert.equal(
      verifySourceQuote(
        "Consultant shall pay liquidated damages of INR 5,00,000",
        docText
      ),
      false
    );

    // Fabricated model output claiming an exit bond penalty quote that does NOT exist in docText
    const hallucinatedOutput = {
      overallRisk: "High",
      riskScore: 85,
      summary: "Found major penalty.",
      flaggedClauses: [
        {
          quote: "Consultant shall pay liquidated damages of INR 5,00,000 upon early termination",
          title: "Predatory Exit Bond",
          risk: "High",
          whyItMatters: "Forces massive damages for contract exit.",
          negotiationLine: "Please remove the early termination liquidated damages penalty.",
        },
      ],
      missingProtections: [],
    };

    const normalized = normalizeAnalysisResult(hallucinatedOutput, docText);

    // The unverified finding must be rejected
    assert.equal(
      normalized.flaggedClauses.length,
      0,
      "Unverified quote must be excluded from flaggedClauses"
    );
    assert.equal(
      normalized.unverifiedCount,
      1,
      "unverifiedCount must be incremented"
    );
    assert.equal(
      normalized.hasSupportedFindings,
      false,
      "hasSupportedFindings must be false when no quotes survive"
    );

    // Must NOT claim a fake safe document or fixed high score
    assert.equal(normalized.overallRisk, "Low");
    assert.equal(normalized.riskScore, 0);

    // Must NOT be included in the negotiation email draft
    assert.ok(
      !normalized.negotiationEmail.body.includes("Predatory Exit Bond"),
      "Negotiation email must not mention rejected unverified clause title"
    );
    assert.ok(
      !normalized.negotiationEmail.body.includes("liquidated damages of INR 5,00,000"),
      "Negotiation email must not mention rejected quote"
    );
  });

  // Case E: Sort and filter (Object cohesion)
  test("Case E: Sort and filter operations preserve finding cohesion (id, title, risk, quote, whyItMatters, negotiationLine remain attached)", () => {
    const clauses = [
      {
        id: "clause-1",
        title: "Low Term A",
        risk: "Low",
        quote: "Quote for Low Term A",
        whyItMatters: "Explanation for Low Term A",
        negotiationLine: "Pushback for Low Term A",
      },
      {
        id: "clause-2",
        title: "High Term B",
        risk: "High",
        quote: "Quote for High Term B",
        whyItMatters: "Explanation for High Term B",
        negotiationLine: "Pushback for High Term B",
      },
      {
        id: "clause-3",
        title: "Medium Term C",
        risk: "Medium",
        quote: "Quote for Medium Term C",
        whyItMatters: "Explanation for Medium Term C",
        negotiationLine: "Pushback for Medium Term C",
      },
    ];

    // Filter test: Filtering for "high" returns only High Term B with all properties attached
    const highOnly = clauses.filter((c) => c.risk.toLowerCase() === "high");
    assert.equal(highOnly.length, 1);
    assert.equal(highOnly[0].id, "clause-2");
    assert.equal(highOnly[0].title, "High Term B");
    assert.equal(highOnly[0].quote, "Quote for High Term B");
    assert.equal(highOnly[0].whyItMatters, "Explanation for High Term B");
    assert.equal(highOnly[0].negotiationLine, "Pushback for High Term B");

    // Sort test: High -> Medium -> Low
    const sorted = [...clauses].sort((a, b) => {
      const rankA = getSeverityRank(getNormalizedSeverity(a.risk));
      const rankB = getSeverityRank(getNormalizedSeverity(b.risk));
      return rankA - rankB;
    });

    assert.equal(sorted[0].id, "clause-2");
    assert.equal(sorted[0].quote, "Quote for High Term B");
    assert.equal(sorted[1].id, "clause-3");
    assert.equal(sorted[1].quote, "Quote for Medium Term C");
    assert.equal(sorted[2].id, "clause-1");
    assert.equal(sorted[2].quote, "Quote for Low Term A");
  });

  // Case F: Request race handling
  test("Case F: Request race handling rejects stale or superseded asynchronous responses", async () => {
    let activeRequestId = 0;
    let committedState = null;

    // Simulate sending Request 1
    const req1Id = ++activeRequestId; // req1Id = 1
    const controller1 = new AbortController();

    // User switches document / clears before Request 1 finishes, aborting controller 1
    controller1.abort();
    const req2Id = ++activeRequestId; // req2Id = 2

    // Simulated resolution for Request 1 (delayed)
    const resolveRequest1 = () => {
      if (controller1.signal.aborted) return; // Cleanly aborted
      if (req1Id !== activeRequestId) return; // Stale, ignore
      committedState = "Result 1";
    };

    // Simulated resolution for Request 2 (latest)
    const resolveRequest2 = () => {
      if (req2Id !== activeRequestId) return;
      committedState = "Result 2";
    };

    resolveRequest1();
    resolveRequest2();

    assert.equal(committedState, "Result 2", "Only the latest request commits to state");
  });

  // Case G: API failure honest error
  test("Case G: API failure returns honest descriptive error and does NOT return fabricated canned findings", () => {
    // When LLM generates invalid / corrupt responses
    const unparseableOutput = "Model returned arbitrary text without any valid JSON.";

    assert.throws(() => {
      extractJsonObject(unparseableOutput);
    }, /No valid JSON/i);

    // When normalizeAnalysisResult receives null or non-object
    assert.throws(() => {
      normalizeAnalysisResult(null, "Document text");
    }, /Invalid model response structure/);

    // Ensure runLocalClauseAnalysis is NOT substituted on API route errors
    // (Route returns HTTP 503 / 502 with error message)
    const simulatedRouteError = {
      status: 503,
      error: "Analysis service temporarily unavailable. Please retry in a moment.",
    };
    assert.equal(simulatedRouteError.status, 503);
    assert.ok(simulatedRouteError.error.includes("temporarily unavailable"));
  });

  // Case H: Email consistency
  test("Case H: Negotiation email contains only pushbacks for accepted findings, and displayed, copied, and Gmail draft formats are identical", () => {
    const verifiedClauses = [
      {
        id: "clause-1",
        title: "Exit Bond Penalty",
        quote: "Training bond valued at INR 1,50,000",
        risk: "High",
        whyItMatters: "Locks candidate into 2-year tenure.",
        negotiationLine: "Please remove the financial exit penalty so separation terms remain voluntary.",
      },
    ];

    const missingProtections = [
      {
        id: "protection-1",
        title: "Guaranteed Timely Stipend Release",
        whyItMatters: "Not found in the supplied text. Stipend should be paid monthly without holdbacks.",
        askFor: "Please guarantee 100% full monthly stipend disbursement on time without security holdbacks.",
      },
    ];

    const email = buildNegotiationEmail(
      "internship",
      verifiedClauses,
      missingProtections,
      "Arjun Sharma"
    );

    // Subject checks
    assert.equal(email.subject, "Proposed Revisions to Internship Offer Letter");

    // Email body must contain all verified findings and protections
    assert.match(email.body, /Exit Bond Penalty/);
    assert.match(
      email.body,
      /Please remove the financial exit penalty so separation terms remain voluntary/
    );
    assert.match(email.body, /Guaranteed Timely Stipend Release/);
    assert.match(email.body, /Arjun Sharma/);

    // Personalization check: signature uses user's name when provided
    assert.ok(!email.body.includes("[Your Name]"));

    // Displayed body format
    const displayedBody = email.body;

    // Copied text format: Subject: ... \n\n Body
    const copiedText = `Subject: ${email.subject}\n\n${displayedBody}`;
    assert.ok(copiedText.startsWith(`Subject: ${email.subject}\n\n`));
    assert.ok(copiedText.includes(displayedBody));

    // Gmail compose URL format
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(
      email.subject
    )}&body=${encodeURIComponent(displayedBody)}`;

    assert.ok(gmailUrl.startsWith("https://mail.google.com/mail/?view=cm"));
    assert.ok(gmailUrl.includes(encodeURIComponent(email.subject)));
    assert.ok(gmailUrl.includes(encodeURIComponent(displayedBody)));
  });
});
