import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, MAX_REQUESTS_PER_WINDOW } from "@/lib/rateLimit";
import {
  extractTextFromRequest,
  extractPdfTextFallback,
  validateExtractedBounds,
} from "@/lib/extract";
import {
  analyzeWithGemini,
  analyzeWithGroq,
  analyzeWithOpenRouter,
} from "@/lib/providers";
import { extractJsonObject, normalizeAnalysisResult } from "@/lib/veto";

export const maxDuration = 60;

/**
 * Handles document audit requests with deployment-aware rate limiting,
 * multi-tier LLM cascade, and strict source integrity verification.
 */
export async function POST(req: NextRequest) {
  // 1. Abuse Protection via Sliding-Window Rate Limiting
  const clientIp =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "127.0.0.1";

  const rateCheck = checkRateLimit(clientIp);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      {
        error: `Too many requests from this address. Please wait ${rateCheck.retryAfter} seconds before analyzing another document.`,
        retryAfter: rateCheck.retryAfter,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateCheck.retryAfter),
          "X-RateLimit-Limit": String(MAX_REQUESTS_PER_WINDOW),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  // 2. Ingest Document Text or Uploaded File (.pdf, .docx, .txt)
  const extracted = await extractTextFromRequest(req);
  if (extracted.error) {
    return NextResponse.json(
      { error: extracted.error },
      { status: extracted.status || 400 }
    );
  }

  let { documentText } = extracted;
  const { pdfInlineData, pdfBuffer } = extracted;

  // 3. Multi-Tier Provider Cascade (Gemini -> Groq -> OpenRouter)
  let responseText = await analyzeWithGemini(
    process.env.GEMINI_API_KEY,
    documentText,
    pdfInlineData
  );

  // In-memory fallback extraction for PDF if Gemini was bypassed or failed
  if (!responseText && !documentText && pdfBuffer) {
    documentText = await extractPdfTextFallback(pdfBuffer);
  }

  // Validate extracted text bounds before fallback calls
  const bounds = validateExtractedBounds(documentText);
  if (!bounds.valid) {
    return NextResponse.json({ error: bounds.error }, { status: 400 });
  }

  if (!responseText) {
    responseText = await analyzeWithGroq(process.env.GROQ_API_KEY, documentText);
  }

  if (!responseText) {
    responseText = await analyzeWithOpenRouter(
      process.env.OPENROUTER_API_KEY,
      documentText
    );
  }

  // 4. Honest 503 If All Remote LLM Services Fail
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

  // 5. Parse and Validate Output Integrity Against Source Text
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
  } catch (normErr) {
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
