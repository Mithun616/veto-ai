import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";
import mammoth from "mammoth";
import { extractText } from "unpdf";

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
const GEMINI_TIMEOUT_MS = 10000; // 10 seconds per Gemini attempt

const BASE_SYSTEM_PROMPT = `You are VetoAI, an ultra-minimal, plain-English contract risk reviewer built for students, freshers, tenants, and consumers.
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

function extractJsonObject(raw: string): unknown {
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
  let pdfBuffer: Buffer | null = null;

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
        pdfBuffer = buffer;
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

  // 1. First, attempt with the 2 active Gemini flash models (10s timeout per model & 200ms backoff)
  if (geminiApiKey && geminiApiKey.trim() !== "") {
    try {
      const ai = new GoogleGenAI({ apiKey: geminiApiKey });

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
          const timeoutPromise = new Promise<never>((_, reject) => {
            const timer = setTimeout(() => {
              reject(new Error(`Gemini ${model} timed out after ${GEMINI_TIMEOUT_MS}ms`));
            }, GEMINI_TIMEOUT_MS);
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

          console.warn(`[VetoAI] Gemini model ${model} failed (${isTimeout ? "timeout 10s" : `status ${status}`}).`);

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

  // 2. Fallback to OpenRouter (tries openrouter/free, then meta-llama/llama-3.3-70b-instruct:free)
  if (
    !responseText &&
    openRouterApiKey &&
    openRouterApiKey.trim() !== ""
  ) {
    // If this was a PDF upload and text has not been extracted yet, extract it via unpdf
    if (!documentText && pdfBuffer) {
      try {
        console.log(
          "[VetoAI] Gemini failed for PDF. Extracting text via unpdf for OpenRouter fallback..."
        );
        const extracted = await extractText(new Uint8Array(pdfBuffer), {
          mergePages: true,
        });
        documentText = (extracted.text || "").trim();
        console.log(
          `[VetoAI] Extracted ${documentText.length} characters from PDF using unpdf.`
        );
      } catch (unpdfErr) {
        console.warn("[VetoAI] unpdf text extraction failed:", unpdfErr);
      }
    }

    if (documentText.trim().length >= 50) {
      const openRouterModels = [
        "openrouter/free",
        "meta-llama/llama-3.3-70b-instruct:free",
      ];

    for (const orModel of openRouterModels) {
      try {
        console.log(`[VetoAI] Attempting OpenRouter fallback with model: ${orModel}...`);
        const openRouterResponse = await fetch(
          "https://openrouter.ai/api/v1/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${openRouterApiKey.trim()}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: orModel,
              messages: [
                {
                  role: "system",
                  content: `${BASE_SYSTEM_PROMPT}\n\nIMPORTANT: Respond ONLY with a valid JSON object matching the requested schema. Do not enclose in markdown and do not include extra commentary.`,
                },
                {
                  role: "user",
                  content: `DOCUMENT TO ANALYZE:\n"""\n${documentText}\n"""`,
                },
              ],
            }),
            signal: AbortSignal.timeout(30000),
          }
        );

        if (openRouterResponse.ok) {
          const orData = await openRouterResponse.json();
          const content = orData.choices?.[0]?.message?.content;
          if (content) {
            responseText = content;
            console.log(`[VetoAI] Successfully received analysis from OpenRouter model: ${orModel}`);
            break;
          }
        } else {
          const orStatus = openRouterResponse.status;
          const orErrorText = await openRouterResponse.text().catch(() => "");
          console.warn(`[VetoAI] OpenRouter model ${orModel} returned status ${orStatus}: ${orErrorText.substring(0, 80)}`);
          lastStatus = orStatus;
        }
      } catch (orErr) {
        console.warn(`[VetoAI] OpenRouter model ${orModel} failed:`, orErr);
      }
    }
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
    data = extractJsonObject(responseText) as RawAnalysisData;
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
