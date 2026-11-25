/**
 * @fileoverview Request parsing and text extraction module for VetoAI.
 * Extracts document text and inline file buffers from multipart form data
 * (.pdf, .docx, .txt) and direct JSON paste payloads.
 */

import { NextRequest } from "next/server";
import mammoth from "mammoth";
import { extractText } from "unpdf";
import {
  validateDocumentText,
  validateFileMetadata,
  MAX_DOCUMENT_LENGTH,
  MIN_DOCUMENT_LENGTH,
} from "./veto.ts";

/**
 * Result of request text extraction.
 */
export interface ExtractedRequestData {
  documentText: string;
  pdfInlineData: { mimeType: "application/pdf"; data: string } | null;
  pdfBuffer: Buffer | null;
  error?: string;
  status?: number;
}

/**
 * Extracts raw text or base64 PDF streams from an uploaded file.
 *
 * @param fileObj - The file object retrieved from FormData.
 * @returns Extracted document text, PDF inline data, and PDF buffer.
 */
async function processUploadedFile(fileObj: File): Promise<{
  text: string;
  pdfInlineData: { mimeType: "application/pdf"; data: string } | null;
  pdfBuffer: Buffer | null;
}> {
  const fileName = fileObj.name.toLowerCase();
  const arrayBuffer = await fileObj.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (fileName.endsWith(".txt")) {
    return { text: buffer.toString("utf-8"), pdfInlineData: null, pdfBuffer: null };
  }

  if (fileName.endsWith(".docx")) {
    const result = await mammoth.extractRawText({ buffer });
    return { text: result.value || "", pdfInlineData: null, pdfBuffer: null };
  }

  if (fileName.endsWith(".pdf")) {
    return {
      text: "",
      pdfBuffer: buffer,
      pdfInlineData: {
        mimeType: "application/pdf",
        data: buffer.toString("base64"),
      },
    };
  }

  return { text: "", pdfInlineData: null, pdfBuffer: null };
}

/**
 * Parses multipart form data and validates file constraints.
 *
 * @param req - Incoming NextRequest.
 * @returns Extracted request data or validation error.
 */
async function extractFromFormData(req: NextRequest): Promise<ExtractedRequestData> {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return { documentText: "", pdfInlineData: null, pdfBuffer: null, error: "No document file provided in form data.", status: 400 };
    }

    const fileObj = file as File;
    const fileValidation = validateFileMetadata(fileObj.name, fileObj.size, fileObj.type);
    if (!fileValidation.valid) {
      return { documentText: "", pdfInlineData: null, pdfBuffer: null, error: fileValidation.error || "Invalid file uploaded.", status: 400 };
    }

    const processed = await processUploadedFile(fileObj);
    return {
      documentText: processed.text,
      pdfInlineData: processed.pdfInlineData,
      pdfBuffer: processed.pdfBuffer,
    };
  } catch (err) {
    console.error("[VetoAI] File parsing error:", err);
    return { documentText: "", pdfInlineData: null, pdfBuffer: null, error: "Failed to parse the uploaded document.", status: 400 };
  }
}

/**
 * Parses direct JSON paste payload from request.
 *
 * @param req - Incoming NextRequest.
 * @returns Extracted document text or error.
 */
async function extractFromJson(req: NextRequest): Promise<ExtractedRequestData> {
  try {
    const body = (await req.json()) as { documentText?: unknown };
    const rawText = typeof body?.documentText === "string" ? body.documentText : "";
    return { documentText: rawText, pdfInlineData: null, pdfBuffer: null };
  } catch {
    return { documentText: "", pdfInlineData: null, pdfBuffer: null, error: "Invalid JSON format in request body.", status: 400 };
  }
}

/**
 * Extracts and validates document text from either multipart upload or JSON payload.
 *
 * @param req - Incoming NextRequest.
 * @returns Fully validated request data or structured error.
 */
export async function extractTextFromRequest(req: NextRequest): Promise<ExtractedRequestData> {
  const contentType = req.headers.get("content-type") || "";

  const data = contentType.includes("multipart/form-data")
    ? await extractFromFormData(req)
    : await extractFromJson(req);

  if (data.error) return data;

  if (!data.pdfInlineData) {
    const textValidation = validateDocumentText(data.documentText);
    if (!textValidation.valid) {
      return { ...data, error: textValidation.error, status: 400 };
    }
    data.documentText = textValidation.text;
  }

  return data;
}

/**
 * Extracts text from an in-memory PDF buffer using unpdf for fallback providers.
 *
 * @param pdfBuffer - Raw in-memory PDF buffer.
 * @returns Extracted text string.
 */
export async function extractPdfTextFallback(pdfBuffer: Buffer): Promise<string> {
  try {
    const extracted = await extractText(new Uint8Array(pdfBuffer), { mergePages: true });
    return (extracted.text || "").trim();
  } catch (err) {
    console.warn("[VetoAI] unpdf text extraction failed:", err);
    return "";
  }
}

/**
 * Validates extracted text bounds against application safety limits.
 *
 * @param text - Extracted document text.
 * @returns Object indicating whether bounds are valid, plus error message if not.
 */
export function validateExtractedBounds(text: string): { valid: boolean; error?: string } {
  if (text.length > MAX_DOCUMENT_LENGTH) {
    return {
      valid: false,
      error: `Extracted document text (${text.length.toLocaleString()} characters) exceeds the maximum safe limit of ${MAX_DOCUMENT_LENGTH.toLocaleString()} characters. Please provide a shorter section or clause.`,
    };
  }

  if (text.trim().length < MIN_DOCUMENT_LENGTH) {
    return {
      valid: false,
      error: `Unable to extract sufficient readable text from the document (minimum ${MIN_DOCUMENT_LENGTH} characters required). Please ensure the file contains selectable text.`,
    };
  }

  return { valid: true };
}
