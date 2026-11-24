import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";

interface RawFlaggedClause {
  title?: unknown;
  quote?: unknown;
  risk?: unknown;
  whyItMatters?: unknown;
  negotiationLine?: unknown;
}

interface RawMissingProtection {
  title?: unknown;
  whyItMatters?: unknown;
  askFor?: unknown;
}

interface RawNegotiationEmail {
  subject?: unknown;
  body?: unknown;
}

interface RawAnalysisData {
  overallRisk?: unknown;
  riskScore?: unknown;
  summary?: unknown;
  flaggedClauses?: RawFlaggedClause[];
  missingProtections?: RawMissingProtection[];
  negotiationEmail?: RawNegotiationEmail;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    return NextResponse.json(
      {
        error:
          "GEMINI_API_KEY is missing. Please configure your Gemini API key in your environment variables.",
      },
      { status: 500 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON in request body." },
      { status: 400 }
    );
  }

  const { documentText } = (body as { documentText?: unknown }) || {};
  if (
    typeof documentText !== "string" ||
    documentText.trim().length < 50
  ) {
    return NextResponse.json(
      {
        error:
          "documentText must be a string with at least 50 characters to perform analysis.",
      },
      { status: 400 }
    );
  }

  const prompt = `You are VetoAI, an expert educational document-risk reviewer designed for students, freshers, interns, tenants, and everyday consumers.
Analyze the following document text thoroughly for unfair traps, one-sided legal liabilities, aggressive penalties, and critical missing protections.

DOCUMENT TO ANALYZE:
"""
${documentText}
"""

Focus on common traps and risks, including:
1. Internship / Employment: Mandatory training bonds, heavy financial exit penalties (e.g. demanding ₹1,00,000+ or USD equivalent for training/exit), non-compete clauses prohibiting work in the same industry, unilateral stipend/salary withholding or deductions, excessive notice periods (e.g. 90 days for interns/probation), and vague termination terms.
2. Intellectual Property (IP): Overreaching clauses claiming 100% assignment of all personal side projects, pre-existing open source code, or ideas created off-hours without company resources.
3. Rental Agreements: Unfair security deposit deductions (e.g. mandatory non-refundable painting/deep cleaning fees), landlord right to enter premises without prior notice, vague forfeiture of deposit, sudden eviction without reasonable notice, or landlord disclaiming all repair and structural maintenance duties.
4. Consumer & SaaS Terms: Unilateral modification of terms without notice, automatic renewals with hidden fees, waiver of liability for negligence, or unfair dispute resolution venues.
5. Missing Protections: Critical clauses that should be present to protect the signer (e.g., explicit deposit refund timeline within 7-14 days, mutual notice period, clear definition of working hours/overtime compensation, dispute escalation process).

Provide your evaluation strictly formatted as JSON according to the following fields:
- overallRisk: "Low" | "Medium" | "High" (Low for fair balanced terms, Medium for minor one-sided clauses, High for aggressive bonds/penalties/forfeitures)
- riskScore: integer from 0 to 100 (0 = completely safe/standard, 100 = extremely predatory)
- summary: A clear 2-4 sentence plain-English summary explaining the key findings and danger level.
- flaggedClauses: List of problematic clauses detected. For each:
    * title: Short name of the issue (e.g. "Unreasonable Training Bond Penalty", "Broad IP Grab on Personal Projects")
    * quote: Direct snippet or close quotation from the document illustrating the issue
    * risk: "Low" | "Medium" | "High"
    * whyItMatters: Clear, conversational explanation of how this hurts the signer
    * negotiationLine: Exact respectful, assertive language to counter or push back on this clause
- missingProtections: List of critical terms absent from the text. For each:
    * title: Name of missing clause (e.g. "Security Deposit Return Guarantee", "Notice Period Mutuality")
    * whyItMatters: Why omitting this leaves the signer vulnerable
    * askFor: Exact wording or polite request to include this protection
- negotiationEmail: A complete, professional, diplomatic email draft ready for the user to copy and send:
    * subject: A professional email subject line
    * body: Full polite email body referencing the clauses, explaining the requests, and proposing fair compromises.

Always maintain an educational, empowering, and balanced tone.`;

  try {
    const ai = new GoogleGenAI({ apiKey });

    // Primary target model per specification is gemini-2.5-flash.
    // If the API indicates that 2.5 is unavailable or experiencing temporary high demand, fallback gracefully.
    const modelsToTry = [
      "gemini-2.5-flash",
      "gemini-3.6-flash",
      "gemini-3.8-flash",
    ];

    const generateConfig = {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          overallRisk: {
            type: Type.STRING,
            enum: ["Low", "Medium", "High"],
          },
          riskScore: {
            type: Type.INTEGER,
            description: "Risk score from 0 to 100",
          },
          summary: {
            type: Type.STRING,
          },
          flaggedClauses: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                quote: { type: Type.STRING },
                risk: { type: Type.STRING, enum: ["Low", "Medium", "High"] },
                whyItMatters: { type: Type.STRING },
                negotiationLine: { type: Type.STRING },
              },
              required: [
                "title",
                "quote",
                "risk",
                "whyItMatters",
                "negotiationLine",
              ],
            },
          },
          missingProtections: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                whyItMatters: { type: Type.STRING },
                askFor: { type: Type.STRING },
              },
              required: ["title", "whyItMatters", "askFor"],
            },
          },
          negotiationEmail: {
            type: Type.OBJECT,
            properties: {
              subject: { type: Type.STRING },
              body: { type: Type.STRING },
            },
            required: ["subject", "body"],
          },
        },
        required: [
          "overallRisk",
          "riskScore",
          "summary",
          "flaggedClauses",
          "missingProtections",
          "negotiationEmail",
        ],
      },
    };

    let responseText = "";
    let lastError: unknown = null;

    for (const model of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: generateConfig,
        });
        if (response.text) {
          responseText = response.text;
          break;
        }
      } catch (err: unknown) {
        lastError = err;
        console.warn(`Model ${model} attempt failed, trying fallback...`);
      }
    }

    if (!responseText) {
      throw lastError || new Error("Failed to generate response from Gemini API.");
    }

    let data: RawAnalysisData;
    try {
      data = JSON.parse(responseText) as RawAnalysisData;
    } catch {
      const cleanJson = responseText
        .replace(/^```json\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim();
      data = JSON.parse(cleanJson) as RawAnalysisData;
    }

    const overallRisk: "Low" | "Medium" | "High" =
      data.overallRisk === "Low" ||
      data.overallRisk === "Medium" ||
      data.overallRisk === "High"
        ? data.overallRisk
        : "Medium";

    const riskScore =
      typeof data.riskScore === "number" && !isNaN(data.riskScore)
        ? Math.min(100, Math.max(0, Math.round(data.riskScore)))
        : 50;

    const summary = typeof data.summary === "string" ? data.summary : "";

    const rawClauses = Array.isArray(data.flaggedClauses)
      ? data.flaggedClauses
      : [];
    const flaggedClauses = rawClauses.map((clause: RawFlaggedClause) => {
      const riskVal: "Low" | "Medium" | "High" =
        clause.risk === "Low" ||
        clause.risk === "Medium" ||
        clause.risk === "High"
          ? clause.risk
          : "Medium";
      return {
        title: String(clause.title || "Flagged Clause"),
        quote: String(clause.quote || ""),
        risk: riskVal,
        whyItMatters: String(clause.whyItMatters || ""),
        negotiationLine: String(clause.negotiationLine || ""),
      };
    });

    const rawProtections = Array.isArray(data.missingProtections)
      ? data.missingProtections
      : [];
    const missingProtections = rawProtections.map(
      (item: RawMissingProtection) => ({
        title: String(item.title || "Missing Protection"),
        whyItMatters: String(item.whyItMatters || ""),
        askFor: String(item.askFor || ""),
      })
    );

    const negotiationEmail = {
      subject: String(
        data.negotiationEmail?.subject || "Discussion Regarding Agreement Terms"
      ),
      body: String(
        data.negotiationEmail?.body ||
          "Dear Hiring Manager / Landlord,\n\nThank you for sharing the agreement. I would like to discuss a few clauses..."
      ),
    };

    return NextResponse.json({
      overallRisk,
      riskScore,
      summary,
      flaggedClauses,
      missingProtections,
      negotiationEmail,
    });
  } catch (error: unknown) {
    console.error("VetoAI analysis error:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "An error occurred while analyzing the document with Gemini. Please try again.";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
