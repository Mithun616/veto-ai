import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";
import mammoth from "mammoth";
import { extractText } from "unpdf";
import {
  BASE_SYSTEM_PROMPT,
  extractJsonObject,
  normalizeAnalysisResult,
  validateDocumentText,
  validateFileMetadata,
} from "@/lib/veto";

export const maxDuration = 60;

const GEMINI_TIMEOUT_MS = 12000; // 12s timeout per model attempt (ensures gemini-3.6-flash completes)

export async function POST(req: NextRequest) {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const groqApiKey = process.env.GROQ_API_KEY;
  const openRouterApiKey = process.env.OPENROUTER_API_KEY;

  const contentType = req.headers.get("content-type") || "";

  let documentText = "";
  let pdfInlineData: { mimeType: "application/pdf"; data: string } | null = null;
  let pdfBuffer: Buffer | null = null;

  // 1. Process Multipart Form Data (File Uploads)
  if (contentType.includes("multipart/form-data")) {
    try {
      const formData = await req.formData();
      const file = formData.get("file");

      if (!file || typeof file === "string") {
        return NextResponse.json(
          { error: "No document file provided in form data." },
          { status: 400 }
        );
      }

      const fileObj = file as File;
      const fileValidation = validateFileMetadata(
        fileObj.name,
        fileObj.size,
        fileObj.type
      );

      if (!fileValidation.valid) {
        return NextResponse.json(
          { error: fileValidation.error || "Invalid file uploaded." },
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
      }
    } catch (err: unknown) {
      console.error("[VetoAI] File parsing error:", err);
      return NextResponse.json(
        { error: "Failed to parse the uploaded document." },
        { status: 400 }
      );
    }
  } else {
    // 2. Process JSON Payload (Direct Text Paste)
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON format in request body." },
        { status: 400 }
      );
    }

    const { documentText: rawText } =
      (body as { documentText?: unknown }) || {};

    if (typeof rawText === "string") {
      documentText = rawText;
    }
  }

  // 3. Text Bounds & Sanitization (Unless native PDF inline data is provided)
  if (!pdfInlineData) {
    const textValidation = validateDocumentText(documentText);
    if (!textValidation.valid) {
      return NextResponse.json(
        { error: textValidation.error },
        { status: 400 }
      );
    }
    documentText = textValidation.text;
  }

  let responseText = "";

  // ---------------------------------------------------------------------------
  // 4. Provider #1: Gemini Flash Cascade (gemini-3.8-flash -> gemini-3.6-flash)
  // ---------------------------------------------------------------------------
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

      let promptContents: unknown;
      if (pdfInlineData) {
        promptContents = [
          { inlineData: pdfInlineData },
          { text: BASE_SYSTEM_PROMPT },
        ];
      } else {
        promptContents = `${BASE_SYSTEM_PROMPT}\n\nDOCUMENT TO ANALYZE:\n"""\n${documentText}\n"""`;
      }

      for (let i = 0; i < modelsToTry.length; i++) {
        const model = modelsToTry[i];
        try {
          const timeoutPromise = new Promise<never>((_, reject) => {
            const timer = setTimeout(() => {
              reject(
                new Error(`Gemini ${model} timed out after ${GEMINI_TIMEOUT_MS}ms`)
              );
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
            console.log(`[VetoAI] Successfully analyzed via Gemini model: ${model}`);
            break;
          }
        } catch (err: unknown) {
          const isTimeout = (err as Error)?.message?.includes("timed out");
          console.warn(
            `[VetoAI] Gemini ${model} failed (${isTimeout ? "timeout 8s" : "error"}).`
          );

          if (i < modelsToTry.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 200));
          }
        }
      }
    } catch (geminiErr) {
      console.warn("[VetoAI] Gemini pipeline error:", geminiErr);
    }
  }

  // ---------------------------------------------------------------------------
  // 5. In-Memory PDF Text Extraction for Fallbacks (via unpdf)
  // ---------------------------------------------------------------------------
  if (!responseText && !documentText && pdfBuffer) {
    try {
      console.log("[VetoAI] Extracting text from PDF buffer via unpdf...");
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

  // Validate extracted text length against upper limits
  if (documentText.length > 15000) {
    documentText = documentText.slice(0, 15000);
  }

  if (!documentText) {
    documentText = "Document content under legal risk review.";
  }

  // ---------------------------------------------------------------------------
  // 6. Provider #2: Groq (qwen/qwen3.8-27b -> openai/gpt-oss-120b, ultra-fast)
  // ---------------------------------------------------------------------------
  if (
    !responseText &&
    groqApiKey &&
    groqApiKey.trim() !== "" &&
    documentText.trim().length >= 20
  ) {
    const groqModels = ["qwen/qwen3.8-27b", "openai/gpt-oss-120b"];

    for (const groqModel of groqModels) {
      try {
        console.log(
          `[VetoAI] Attempting Groq fallback with model: ${groqModel}...`
        );
        const groqResponse = await fetch(
          "https://api.groq.com/openai/v1/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${groqApiKey.trim()}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: groqModel,
              response_format: { type: "json_object" },
              messages: [
                {
                  role: "system",
                  content: `${BASE_SYSTEM_PROMPT}\n\nIMPORTANT: Respond ONLY with a valid JSON object matching the requested schema.`,
                },
                {
                  role: "user",
                  content: `DOCUMENT TO ANALYZE:\n"""\n${documentText}\n"""`,
                },
              ],
              max_tokens: 3000,
            }),
            signal: AbortSignal.timeout(15000),
          }
        );

        if (groqResponse.ok) {
          const groqData = await groqResponse.json();
          const content = groqData.choices?.[0]?.message?.content;
          if (content) {
            responseText = content;
            console.log(
              `[VetoAI] Successfully received analysis from Groq model: ${groqModel}`
            );
            break;
          }
        } else {
          const errText = await groqResponse.text().catch(() => "");
          console.warn(
            `[VetoAI] Groq model ${groqModel} returned status ${groqResponse.status}: ${errText.substring(
              0,
              100
            )}`
          );
        }
      } catch (groqErr) {
        console.warn(`[VetoAI] Groq model ${groqModel} failed:`, groqErr);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 7. Provider #3: OpenRouter (openrouter/free -> meta-llama/llama-3.3-70b-instruct:free)
  // ---------------------------------------------------------------------------
  if (
    !responseText &&
    openRouterApiKey &&
    openRouterApiKey.trim() !== "" &&
    documentText.trim().length >= 20
  ) {
    const openRouterModels = [
      "openrouter/free",
      "meta-llama/llama-3.3-70b-instruct:free",
    ];

    for (const orModel of openRouterModels) {
      try {
        console.log(
          `[VetoAI] Attempting OpenRouter fallback with model: ${orModel}...`
        );
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
            console.log(
              `[VetoAI] Successfully received analysis from OpenRouter model: ${orModel}`
            );
            break;
          }
        } else {
          const orStatus = openRouterResponse.status;
          const orErrorText = await openRouterResponse.text().catch(() => "");
          console.warn(
            `[VetoAI] OpenRouter model ${orModel} returned status ${orStatus}: ${orErrorText.substring(
              0,
              80
            )}`
          );
        }
      } catch (orErr) {
        console.warn(`[VetoAI] OpenRouter model ${orModel} failed:`, orErr);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 8. Honest Error Handling If All Providers Fail
  // Do NOT fabricate canned findings or pretend an outage was a successful scan.
  // ---------------------------------------------------------------------------
  if (!responseText) {
    console.warn(
      "[VetoAI] All remote LLMs unavailable or timed out. Reporting honest retry state."
    );
    return NextResponse.json(
      {
        error:
          "AI review services are temporarily unavailable. Please check your network or try again in a few moments.",
      },
      { status: 503 }
    );
  }

  // ---------------------------------------------------------------------------
  // 9. Parse and Sanitize Final Output with Strict Source Verification
  // ---------------------------------------------------------------------------
  let rawParsed: unknown;
  try {
    rawParsed = extractJsonObject(responseText);
  } catch (parseErr) {
    console.warn(
      "[VetoAI] Failed to extract structured JSON from model response:",
      parseErr
    );
    return NextResponse.json(
      {
        error:
          "The AI model returned an unparseable response. Please retry your review.",
      },
      { status: 502 }
    );
  }

  try {
    const finalResult = normalizeAnalysisResult(rawParsed, documentText);
    return NextResponse.json(finalResult);
  } catch (normErr: unknown) {
    console.error("[VetoAI] Output validation error:", normErr);
    return NextResponse.json(
      {
        error:
          "Unable to verify analysis findings against the submitted document. Please retry.",
      },
      { status: 500 }
    );
  }
}
