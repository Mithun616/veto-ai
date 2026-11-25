# VetoAI — Document Risk Review & Pushback Drafts

> **Educational Document-Risk Reviewer • Not Legal Advice**  
> *Review offers, leases, and terms for concerning clauses and missing protections—then draft a respectful response.*

[![Next.js](https://img.shields.io/badge/Next.js-16.4-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?logo=react)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v4-38bdf8?logo=tailwind-css)](https://tailwindcss.com/)
[![Google Gemini](https://img.shields.io/badge/Google%20Gemini-3.8%20Flash-8E75B2?logo=google)](https://ai.google.dev/)
[![Automated Tests](https://img.shields.io/badge/Node%20Test-21%2F21%20Passing-brightgreen)](https://nodejs.org/api/test.html)

---

## 📌 Problem Statement

Every year, millions of students, freshers, tenants, and consumers enter into binding agreements containing severe, asymmetric traps:
- **Employment & Internships**: Heavy liquidated damages training bonds (e.g., ₹1,50,000–₹2,00,000 penalty for leaving), 50% salary/stipend withholding disguised as "security deposits", 90-day employee notice periods paired with immediate employer termination rights, and overbroad intellectual property assignment that claims ownership over personal weekend side projects and open-source contributions.
- **Tenancy & Leases**: Mandatory non-refundable painting or deep-cleaning fees, security deposit refunds delayed by 90 to 120 days, disclaimers of all landlord structural maintenance obligations, unannounced landlord entry at any hour, and complete forfeiture of deposits upon early departure.
- **SaaS & Freelance Contracts**: Unlimited indemnification without liability caps, indefinite payment withholding on subjective grounds, and worldwide non-compete clauses.

Because professional legal consultation is financially out of reach for students and everyday consumers, predatory clauses often go unnoticed until it is too late.

---

## 💡 Solution (VetoAI)

**VetoAI** is an ultra-fast, plain-English educational document auditor that reviews agreements before signing:
1. **Flag Concerning Clauses**: Pinpoints predatory language, provides verbatim source excerpts, translates legal jargon into plain English ("Why it matters:"), and provides ready-to-use counter-arguments ("Suggested pushback:").
2. **Identify Missing Protections**: Checks the document against standard fair-practice safeguards that were suspiciously omitted (e.g. 14-day deposit refund deadlines, mutual termination notice, landlord structural repair obligations).
3. **Generate Negotiation Counter-Proposals**: Prepares a diplomatic, ready-to-send counter-offer email with 1-click clipboard copy and a direct link to open a draft in Gmail.
4. **Resilient 4-Tier Audit Pipeline**: Combines Google Gemini 3.8/3.6 Flash, Groq (`llama-3.3-70b-versatile`), OpenRouter (`llama-3.3-70b-instruct`), and a deterministic local clause-pattern engine that guarantees 100% availability even with zero network or during upstream model outages.

---

## 🏗️ Architecture

```text
┌────────────────────────────────────────────────────────────────────────┐
│                   Frontend Workspace (app/page.tsx)                    │
│  - Modular components: DocumentWorkspace, RiskOverview, ClauseCards    │
│  - Text input (min 20, max 15,000 chars) & file upload (<= 4 MB)       │
│  - In-memory client handling; stale state detection on edits           │
│  - WCAG-compliant ARIA semantics, role="meter", aria-live="polite"     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ POST /api/analyze
                                    │ (multipart/form-data or application/json)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                  Next.js API Route (app/api/analyze/route.ts)          │
│  - Strict input validation & file metadata bounds check                │
│  - In-memory buffer conversion (zero disk writes or leaks)             │
│  - mammoth (DOCX text extraction) & unpdf (PDF text extraction)        │
│  - maxDuration = 60s                                                   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     4-Tier Provider Failover Engine                    │
│  Tier 1: Google Gemini 3.8 Flash ──(timeout 8s)──> Gemini 3.6 Flash    │
│  Tier 2: Groq Cloud (llama-3.3-70b-versatile, ultra-fast fallback)     │
│  Tier 3: OpenRouter (meta-llama/llama-3.3-70b-instruct:free)           │
│  Tier 4: Deterministic Local Clause Pattern Engine (lib/veto.ts)       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Deserialization & Normalization
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                 Sanitized Structured JSON Response                     │
│  { overallRisk, riskScore, summary, flaggedClauses,                    │
│    missingProtections, negotiationEmail }                              │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🛡️ Security & Privacy

VetoAI is built with a defensive security posture suitable for sensitive personal agreements:
- **HTTP Security Headers** (`next.config.ts`):
  - `X-Content-Type-Options: nosniff` — prevents MIME-sniffing exploits.
  - `X-Frame-Options: DENY` — protects against clickjacking attacks.
  - `Referrer-Policy: strict-origin-when-cross-origin` — prevents leaking referrers to third parties.
- **Strict Input & File Bounds**:
  - Maximum upload size strictly enforced at **4 MB** (`MAX_FILE_SIZE`).
  - Supported document formats validated via extension and MIME checks (`.pdf`, `.docx`, `.txt`).
  - Safe payload character limits enforced between **20 characters** and **15,000 characters** to prevent DoS resource exhaustion.
- **Zero Disk Persistence**:
  - Document parsing (DOCX, PDF, TXT) occurs purely in-memory via Node `Buffer` and `Uint8Array`. No temporary files or uploaded contracts are stored to local disk or remote databases.
- **Privacy Notice & Anonymization Advisory**:
  - The interface displays clear privacy advisories recommending that users redact private identifiable details (such as names, bank details, or contact numbers) before submitting.

---

## 🧪 Testing (`npm test`)

VetoAI includes an automated test suite built on Node's native test runner (`node:test` and `node:assert/strict`), ensuring zero testing dependencies and fast execution.

### Running the Test Suite:
```bash
npm test
```

### Test Coverage Highlights (21 / 21 Passing):
- **Input Validation & Security Bounds**:
  - Non-string inputs (null, undefined, numbers, objects) rejected.
  - Input below 20 characters rejected with descriptive guidance.
  - Inputs exceeding 15,000 characters safely flagged and bounded.
  - File size bounds strictly enforced (empty files rejected, files > 4 MB blocked).
  - Extension and MIME type whitelisting enforced.
- **JSON Parsing & Malformed Model Output**:
  - Standard JSON parsing, markdown-wrapped JSON extraction, and conversational JSON slicing verified.
- **Deterministic Clause Analyzer**:
  - Detection of training bonds and liquidated damages penalties.
  - Detection of stipend/wage withholding and deposit cut schemes.
  - Detection of 90-day asymmetric notice traps.
  - Detection of personal side project and weekend code IP grabs.
  - Detection of rental deposit forfeiture, painting deductions, and unannounced entry.
  - Verification of missing standard protections (14-day deposit timeline, mutual notice).
  - Structured negotiation email generation.
- **Sanitization & Normalization**:
  - Risk score clamping between 0 and 100.
  - Resilient fallback generation on null or corrupted model outputs.

---

## 💻 Tech Stack

- **Framework**: Next.js 16.4 (App Router, Turbopack, Server Components)
- **Language**: TypeScript 5 (Strict Mode, 100% typed, zero `any`)
- **Styling**: Tailwind CSS v4 (Document-Security Dark Theme, Glassmorphism)
- **AI Models & Providers**:
  - Primary: Google Gemini 3.8 Flash & Gemini 3.6 Flash (`@google/genai`)
  - Secondary: Groq Cloud (`llama-3.3-70b-versatile`)
  - Tertiary: OpenRouter (`meta-llama/llama-3.3-70b-instruct:free`)
  - Offline Fallback: Deterministic Local Regex Pattern Engine (`lib/veto.ts`)
- **Document Parsers**:
  - `mammoth` (Clean in-memory DOCX text extraction)
  - `unpdf` (Lightweight, serverless-safe PDF text extraction)
- **Testing**: Node.js Native Test Runner (`node:test`, `node:assert`)

---

## 🚀 Getting Started

### 1. Installation
```bash
git clone https://github.com/your-username/veto.git
cd veto
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Add your API keys:
```env
GEMINI_API_KEY=your_gemini_api_key_here
# Optional fallback providers:
GROQ_API_KEY=your_groq_api_key_here
OPENROUTER_API_KEY=your_openrouter_api_key_here
```
*(Note: If no API keys are supplied, VetoAI automatically runs on its deterministic local clause-pattern engine.)*

### 3. Run Locally
```bash
# Start development server
npm run dev

# Run automated tests
npm test

# Build production bundle
npm run build
npm start
```

---

## ⚖️ Legal Disclaimer

VetoAI is an automated review assistant designed to promote negotiation awareness and contract readability for students, tenants, and consumers. It does not provide legal representation, legal advice, or attorney-client confidentiality. Always consult an attorney licensed in your jurisdiction for binding legal matters.
