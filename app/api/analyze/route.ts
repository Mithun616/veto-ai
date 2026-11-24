import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";
import mammoth from "mammoth";

export const maxDuration = 60;

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

const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4 MB
const GEMINI_TIMEOUT_MS = 5000; // 5 seconds per Gemini attempt

const BASE_SYSTEM_PROMPT = `You are VetoAI, an expert educational document-risk reviewer designed for students, freshers, interns, tenants, and everyday consumers.
Analyze the provided contract/document thoroughly for unfair traps, one-sided legal liabilities, aggressive penalties, and critical missing protections.

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

export async function POST(req: NextRequest) {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const openRouterApiKey = process.env.OPENROUTER_API_KEY;

  if (
    (!geminiApiKey || geminiApiKey.trim() === "") &&
    (!openRouterApiKey || openRouterApiKey.trim() === "")
  ) {
    return NextResponse.json(
      {
        error:
          "AI API key is missing. Please configure GEMINI_API_KEY or OPENROUTER_API_KEY in your environment variables.",
      },
      { status: 500 }
    );
  }

  const contentType = req.headers.get("content-type") || "";

  let documentText = "";
  let pdfInlineData: { mimeType: "application/pdf"; data: string } | null = null;

  if (contentType.includes("multipart/form-data")) {
    try {
      const formData = await req.formData();
      const file = formData.get("file");

      if (!file || typeof file === "string") {
        return NextResponse.json(
          { error: "No file provided in form data." },
          { status: 400 }
        );
      }

      const fileObj = file as File;
      if (fileObj.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          {
            error: `File size exceeds the 4 MB limit (file is ${(
              fileObj.size /
              (1024 * 1024)
            ).toFixed(1)} MB).`,
          },
          { status: 400 }
        );
      }

      const fileName = fileObj.name.toLowerCase();
      const arrayBuffer = await fileObj.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      if (fileName.endsWith(".txt")) {
        documentText = buffer.toString("utf-8");
      } else if (fileName.endsWith(".docx")) {
        const result = await mammoth.extractRawText({ buffer });
        documentText = result.value || "";
      } else if (fileName.endsWith(".pdf")) {
        pdfInlineData = {
          mimeType: "application/pdf",
          data: buffer.toString("base64"),
        };
      } else {
        return NextResponse.json(
          {
            error:
              "Unsupported file format. Please upload a .pdf, .docx, or .txt document.",
          },
          { status: 400 }
        );
      }
    } catch (err: unknown) {
      console.error("File parsing error:", err);
      return NextResponse.json(
        { error: "Failed to process uploaded file." },
        { status: 400 }
      );
    }
  } else {
    // Process JSON request
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body." },
        { status: 400 }
      );
    }

    const { documentText: rawText } =
      (body as { documentText?: unknown }) || {};
    if (typeof rawText === "string") {
      documentText = rawText;
    }
  }

  // If text-based, validate minimum length
  if (!pdfInlineData && documentText.trim().length < 50) {
    return NextResponse.json(
      {
        error:
          "The document or text must contain at least 50 characters to perform analysis.",
      },
      { status: 400 }
    );
  }

  let responseText = "";
  let lastStatus: number | null = null;
  let lastErrorMessage = "";

  // 1. First, attempt with the 2 active Gemini flash models with a 5s timeout & 200ms backoff
  if (geminiApiKey && geminiApiKey.trim() !== "") {
    try {
      const ai = new GoogleGenAI({ apiKey: geminiApiKey });

      // Only the 2 active, supported models (retired models removed)
      const modelsToTry = ["gemini-3.8-flash", "gemini-3.6-flash"];

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

      // Construct prompt contents for PDF vs text
      let promptContents: unknown;
      if (pdfInlineData) {
        promptContents = [
          {
            inlineData: pdfInlineData,
          },
          {
            text: BASE_SYSTEM_PROMPT,
          },
        ];
      } else {
        promptContents = `${BASE_SYSTEM_PROMPT}\n\nDOCUMENT TO ANALYZE:\n"""\n${documentText}\n"""`;
      }

      for (let i = 0; i < modelsToTry.length; i++) {
        const model = modelsToTry[i];
        try {
          // 5-second timeout on each Gemini attempt to avoid slow responses
          const timeoutPromise = new Promise<never>((_, reject) => {
            const timer = setTimeout(() => {
              reject(new Error(`Gemini ${model} timed out after ${GEMINI_TIMEOUT_MS}ms`));
            }, GEMINI_TIMEOUT_MS);
            // Allow process to exit cleanly if needed
            if (typeof timer.unref === "function") timer.unref();
          });

          const generatePromise = ai.models.generateContent({
            model,
            contents: promptContents as string,
            config: generateConfig,
          });

          const response = await Promise.race([generatePromise, timeoutPromise]);

          if (response.text) {
            responseText = response.text;
            break;
          }
        } catch (err: unknown) {
          const isTimeout = (err as Error)?.message?.includes("timed out");
          const status = isTimeout
            ? 504
            : (err as { status?: number })?.status ||
              ((err as Error)?.message?.includes("503") ? 503 : null) ||
              ((err as Error)?.message?.includes("429") ? 429 : null) ||
              500;

          lastStatus = status;
          lastErrorMessage = err instanceof Error ? err.message : String(err);

          console.warn(`[VetoAI] Gemini model ${model} failed (${isTimeout ? "timeout 5s" : `status ${status}`}).`);

          // Short 200ms delay before attempting next model
          if (i < modelsToTry.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 200));
          }
        }
      }
    } catch (geminiErr) {
      console.warn("[VetoAI] Gemini pipeline error:", geminiErr);
    }
  }

  // 2. Immediate fallback to OpenRouter if Gemini failed and OpenRouter API key is available
  if (
    !responseText &&
    openRouterApiKey &&
    openRouterApiKey.trim() !== "" &&
    documentText.trim().length >= 50
  ) {
    try {
      console.log("[VetoAI] Gemini unavailable or timed out. Immediately engaging OpenRouter fallback...");
      const openRouterResponse = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openRouterApiKey.trim()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "openrouter/free",
            response_format: { type: "json_object" },
            messages: [
              {
                role: "system",
                content: `${BASE_SYSTEM_PROMPT}\n\nYou must respond ONLY with a valid JSON object matching the requested schema.`,
              },
              {
                role: "user",
                content: `DOCUMENT TO ANALYZE:\n"""\n${documentText}\n"""`,
              },
            ],
          }),
          signal: AbortSignal.timeout(35000),
        }
      );

      if (openRouterResponse.ok) {
        const orData = await openRouterResponse.json();
        const content = orData.choices?.[0]?.message?.content;
        if (content) {
          responseText = content;
          console.log("[VetoAI] Successfully generated analysis via OpenRouter fallback.");
        }
      } else {
        const orStatus = openRouterResponse.status;
        console.warn(`[VetoAI] OpenRouter API returned status ${orStatus}.`);
        lastStatus = orStatus;
      }
    } catch (orErr) {
      console.warn("[VetoAI] OpenRouter fallback call failed:", orErr);
    }
  }

  // 3. If neither pipeline yielded a response, return a clean error
  if (!responseText) {
    if (
      lastStatus === 503 ||
      lastStatus === 504 ||
      lastStatus === 429 ||
      lastErrorMessage.includes("503") ||
      lastErrorMessage.includes("429") ||
      lastErrorMessage.toLowerCase().includes("timed out") ||
      lastErrorMessage.toLowerCase().includes("high demand")
    ) {
      return NextResponse.json(
        {
          error:
            "AI servers are experiencing high demand right now. Please wait a few seconds and click Run X-Ray Scan again.",
        },
        { status: 503 }
      );
    }

    if (
      lastStatus === 401 ||
      lastStatus === 403 ||
      lastErrorMessage.toLowerCase().includes("api key")
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid or unauthorized API key. Please verify your GEMINI_API_KEY or OPENROUTER_API_KEY in .env.",
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        error:
          "AI servers are experiencing high demand right now. Please wait a few seconds and click Run X-Ray Scan again.",
      },
      { status: 503 }
    );
  }

  // 4. Parse and sanitize the response JSON
  let data: RawAnalysisData;
  try {
    data = JSON.parse(responseText) as RawAnalysisData;
  } catch {
    const cleanJson = responseText
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    try {
      data = JSON.parse(cleanJson) as RawAnalysisData;
    } catch (parseErr) {
      console.error("[VetoAI] Failed to parse response JSON:", parseErr, responseText);
      return NextResponse.json(
        {
          error:
            "AI servers returned an invalid format. Please try running the scan again.",
        },
        { status: 500 }
      );
    }
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
}
