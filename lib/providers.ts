/**
 * @fileoverview Remote LLM provider integrations for VetoAI.
 * Manages the multi-tier cascade across Google Gemini, Groq, and OpenRouter
 * with shared HTTP execution, strict timeouts, and error handling.
 */

import { GoogleGenAI, Type } from "@google/genai";
import { BASE_SYSTEM_PROMPT } from "./veto.ts";

const GEMINI_TIMEOUT_MS = 12000;
const GROQ_TIMEOUT_MS = 15000;
const OPENROUTER_TIMEOUT_MS = 30000;

interface OpenAiChatOptions {
  url: string;
  apiKey: string;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  timeoutMs: number;
  jsonFormat?: boolean;
  maxTokens?: number;
  providerName: string;
}

/**
 * Unified executor for OpenAI-compatible chat completion endpoints (Groq, OpenRouter).
 * Eliminates duplicate fetch, authorization, error logging, and response parsing logic.
 *
 * @param options - Configuration for the chat completion request.
 * @returns Generated content string or null if request failed.
 */
async function callOpenAiCompatibleChat(options: OpenAiChatOptions): Promise<string | null> {
  const { url, apiKey, model, systemPrompt, userPrompt, timeoutMs, jsonFormat, maxTokens, providerName } = options;

  try {
    const requestBody: Record<string, unknown> = {
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    };
    if (jsonFormat) {
      requestBody.response_format = { type: "json_object" };
    }
    if (maxTokens) {
      requestBody.max_tokens = maxTokens;
    }

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.warn(`[VetoAI] ${providerName} model ${model} returned status ${res.status}: ${errText.substring(0, 100)}`);
      return null;
    }

    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content;
    if (content) {
      return content;
    }
    return null;
  } catch (err) {
    console.warn(`[VetoAI] ${providerName} model ${model} failed:`, err);
    return null;
  }
}

/**
 * Generates structured JSON schema configuration for Google Gemini models.
 */
function getGeminiJsonConfig() {
  return {
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
        summary: { type: Type.STRING },
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
            required: ["title", "quote", "risk", "whyItMatters", "negotiationLine"],
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
      required: ["overallRisk", "riskScore", "summary", "flaggedClauses", "missingProtections", "negotiationEmail"],
    },
  };
}

/**
 * Tier 1: Analyzes contract text or PDF stream with Google Gemini models.
 * Tries gemini-3.8-flash first, cascading to gemini-3.6-flash.
 *
 * @param apiKey - Google Gemini API key.
 * @param documentText - Extracted text (if available).
 * @param pdfInlineData - Base64 encoded PDF payload (if available).
 * @returns JSON string response or null on failure.
 */
export async function analyzeWithGemini(
  apiKey: string | undefined,
  documentText: string,
  pdfInlineData: { mimeType: "application/pdf"; data: string } | null
): Promise<string | null> {
  if (!apiKey || apiKey.trim() === "") return null;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const modelsToTry = ["gemini-3.8-flash", "gemini-3.6-flash"];
    const config = getGeminiJsonConfig();

    const promptContents = pdfInlineData
      ? [{ inlineData: pdfInlineData }, { text: BASE_SYSTEM_PROMPT }]
      : `${BASE_SYSTEM_PROMPT}\n\nDOCUMENT TO ANALYZE:\n"""\n${documentText}\n"""`;

    for (let i = 0; i < modelsToTry.length; i++) {
      const model = modelsToTry[i];
      try {
        const timeoutPromise = new Promise<never>((_, reject) => {
          const timer = setTimeout(() => reject(new Error(`Gemini ${model} timed out after ${GEMINI_TIMEOUT_MS}ms`)), GEMINI_TIMEOUT_MS);
          if (typeof timer.unref === "function") timer.unref();
        });

        const generatePromise = ai.models.generateContent({ model, contents: promptContents, config });
        const response = await Promise.race([generatePromise, timeoutPromise]);

        if (response.text) {
          return response.text;
        }
      } catch (err) {
        console.warn(`[VetoAI] Gemini ${model} failed:`, err);
        if (i < modelsToTry.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      }
    }
  } catch (geminiErr) {
    console.warn("[VetoAI] Gemini pipeline error:", geminiErr);
  }
  return null;
}

/**
 * Tier 2: Analyzes document text with Groq fast chat models.
 *
 * @param apiKey - Groq API key.
 * @param documentText - Extracted contract text.
 * @returns JSON string response or null on failure.
 */
export async function analyzeWithGroq(
  apiKey: string | undefined,
  documentText: string
): Promise<string | null> {
  if (!apiKey || apiKey.trim() === "" || documentText.trim().length < 20) return null;

  const groqModels = ["qwen/qwen3.8-27b", "openai/gpt-oss-120b"];

  for (const model of groqModels) {
    const content = await callOpenAiCompatibleChat({
      url: "https://api.groq.com/openai/v1/chat/completions",
      apiKey,
      model,
      systemPrompt: `${BASE_SYSTEM_PROMPT}\n\nIMPORTANT: Respond ONLY with a valid JSON object matching the requested schema.`,
      userPrompt: `DOCUMENT TO ANALYZE:\n"""\n${documentText}\n"""`,
      timeoutMs: GROQ_TIMEOUT_MS,
      jsonFormat: true,
      maxTokens: 3000,
      providerName: "Groq",
    });

    if (content) return content;
  }

  return null;
}

/**
 * Tier 3: Analyzes document text with OpenRouter models.
 *
 * @param apiKey - OpenRouter API key.
 * @param documentText - Extracted contract text.
 * @returns JSON string response or null on failure.
 */
export async function analyzeWithOpenRouter(
  apiKey: string | undefined,
  documentText: string
): Promise<string | null> {
  if (!apiKey || apiKey.trim() === "" || documentText.trim().length < 20) return null;

  const openRouterModels = ["openrouter/free", "meta-llama/llama-3.3-70b-instruct:free"];

  for (const model of openRouterModels) {
    const content = await callOpenAiCompatibleChat({
      url: "https://openrouter.ai/api/v1/chat/completions",
      apiKey,
      model,
      systemPrompt: `${BASE_SYSTEM_PROMPT}\n\nIMPORTANT: Respond ONLY with a valid JSON object matching the requested schema. Do not enclose in markdown and do not include extra commentary.`,
      userPrompt: `DOCUMENT TO ANALYZE:\n"""\n${documentText}\n"""`,
      timeoutMs: OPENROUTER_TIMEOUT_MS,
      providerName: "OpenRouter",
    });

    if (content) return content;
  }

  return null;
}
