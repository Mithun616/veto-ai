# VetoAI — Contract X-Ray & Legal Trap Scanner

> **Educational Document-Risk Reviewer • Not Legal Advice**  
> *Push back before you sign.*

[![Next.js](https://img.shields.io/badge/Next.js-16.4-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?logo=react)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v4-38bdf8?logo=tailwind-css)](https://tailwindcss.com/)
[![Gemini](https://img.shields.io/badge/Google%20Gemini-Flash-8E75B2?logo=google)](https://ai.google.dev/)

---

## 📌 Problem Statement

Every year, millions of students, freshers, interns, tenants, and everyday consumers unknowingly sign predatory agreements:
- **Interns & Freshers** encounter **training bonds** demanding ₹1,00,000–₹2,00,000 in liquidated damages, 50% stipend withholding as "security deposits", 90-day notice periods with 0-day employer termination, and **blanket IP assignment** claiming full ownership over personal side projects built on weekends with personal laptops.
- **Tenants** sign urban rental agreements with mandatory non-refundable painting deductions, 90–120 day deposit refund delays, zero landlord repair duties, unannounced landlord entry, and immediate forfeiture clauses.
- **Consumers & Freelancers** sign one-sided SaaS and vendor terms with hidden auto-renewals, unilateral price increases, and complete waiver of liabilities.

Hiring a lawyer to review an internship offer or rental agreement is cost-prohibitive for most people. **VetoAI** democratizes contract literacy by analyzing contracts in seconds, pointing out unfair traps, highlighting missing protections, and generating polite, assertive counter-negotiation emails.

---

## ✨ Key Features

1. **Native PDF, DOCX & TXT File Upload**:
   - Drag-and-drop or browse files up to 4 MB.
   - **DOCX**: Clean raw text extraction in-memory via `mammoth`.
   - **PDF**: Natively passed to Gemini using base64 `{ inlineData: { mimeType: "application/pdf", data } }`.
   - **TXT**: Direct UTF-8 ingestion.
   - Textarea fallback with live character counter.

2. **Dark-Mode "Contract X-Ray" Split-Screen UI**:
   - High-contrast visual design (`#0B0F19` backdrop, `#111827` glass panels, cyan/emerald/amber/rose risk accents).
   - Real-time animated 4-step scanning stepper ("Reading document...", "Flagging unfair clauses...", "Checking missing protections...", "Drafting negotiation email...").

3. **Animated Circular Risk Score Gauge (0–100)**:
   - Instant visual assessment of overall document risk.
   - Color-coded into **Low (< 35)**, **Medium (35–69)**, or **High (70+)** danger levels with an executive summary.

4. **Flagged Trap Clauses**:
   - Quoted excerpts directly from the uploaded document or PDF.
   - Risk rating (`High`, `Medium`, `Low`).
   - Plain-English explanation of why the clause is dangerous.
   - **"How to push back"** script: Assertive, professional one-liners ready to use in conversation.

5. **Missing Protections**:
   - Highlights standard legal protections that the contract suspiciously omitted (e.g. deposit return deadlines, mutual termination notice, repair responsibilities).
   - Actionable clause suggestions under **"Ask to add"**.

6. **Ready-to-Send Negotiation Email**:
   - AI-drafted diplomatic counter-proposal with subject line and body.
   - Pre-structured to preserve goodwill while addressing high-risk terms.
   - **1-Click Copy**: Copies the entire email to clipboard with temporary "Copied!" confirmation.

7. **1-Click Pre-loaded Samples**:
   - Realistic **India-focused Internship Offer Letter** (training bonds, stipend withholding, 2-year non-compete, personal IP grab).
   - Realistic **India-focused Rental Agreement** (10-month deposit, mandatory painting deduction, 120-day refund wait, 7-day verbal eviction).

---

## 🏗️ Architecture & Flow

```text
┌────────────────────────────────────────────────────────┐
│   Client UI (app/page.tsx - Legal X-Ray Dark UI)       │
│  - Drag-and-drop PDF / DOCX / TXT file upload (<= 4MB) │
│  - Textarea fallback with live character count         │
│  - 1-Click Realistic Trap Samples                      │
└───────────────┬────────────────────────────────────────┘
                │ POST /api/analyze
                │ (multipart/form-data or application/json)
                ▼
┌────────────────────────────────────────────────────────┐
│   Next.js API Route (app/api/analyze/route.ts)         │
│  - Validates size (<= 4 MB) & character limit (>= 50)  │
│  - DOCX: mammoth.extractRawText({ buffer })            │
│  - PDF: inlineData base64 stream                       │
│  - Resilient Model Cascade: gemini-3.6-flash / 3.8     │
└───────────────┬────────────────────────────────────────┘
                │ GoogleGenAI.generateContent
                │ config: { responseMimeType: "application/json", responseSchema }
                ▼
┌────────────────────────────────────────────────────────┐
│   Google Gemini 3.6 / 3.8 Flash                        │
│  - Evaluates traps, bonds & missing terms              │
│  - Returns strictly typed JSON structure               │
└───────────────┬────────────────────────────────────────┘
                │ Structured JSON response
                ▼
┌────────────────────────────────────────────────────────┐
│   Results Dashboard (app/page.tsx)                     │
│  - Circular SVG Risk Gauge (0-100)                     │
│  - Flagged Clauses with "How to push back" scripts     │
│  - Missing Protections with "Ask to add" clauses       │
│  - Ready-to-Send Negotiation Email (1-Click Copy)      │
└────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Turbopack)
- **Frontend**: [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Document Processing**: [`mammoth`](https://www.npmjs.com/package/mammoth) (DOCX), Native Base64 Streaming (PDF)
- **AI Engine**: [Google Gemini Flash](https://ai.google.dev/) via [`@google/genai`](https://www.npmjs.com/package/@google/genai) SDK with structured JSON schemas
- **Icons**: Handcrafted accessible SVGs

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js 18+ (tested on Node.js 20+)
- npm 9+
- A Gemini API key from [Google AI Studio](https://aistudio.google.com/)

### 2. Installation & Configuration

Clone the repository and install dependencies:
```bash
git clone https://github.com/Mithun616/veto-ai.git
cd veto-ai
npm install
```

Configure your environment variables:
```bash
cp .env.example .env
```
Open `.env` and set your key:
```env
GEMINI_API_KEY=AIzaSy...your_gemini_api_key_here
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to access VetoAI.

### 4. Build for Production
```bash
npm run build
npm run start
```

---

## ⚖️ Disclaimer

*VetoAI is an educational document-risk reviewer powered by AI. It provides informational analysis, risk assessments, and draft communication templates for educational purposes only and does NOT constitute licensed legal advice. Always consult a qualified attorney for critical legal decisions.*
