# VetoAI — AI Document-Risk Reviewer & Counter-Offer Generator

> **Submission for PromptWars – AI Prompt Challenge | AI VIBEATHON 2026**  
> *Educational Document-Risk Reviewer • Built with Google Antigravity • Not Legal Advice*  
> *Audit offers, leases, and terms for predatory clauses and missing safeguards—then generate a personalized, diplomatic pushback response in seconds.*

[![Next.js](https://img.shields.io/badge/Next.js-16.4%20(Turbopack)-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?logo=react)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v4-38bdf8?logo=tailwind-css)](https://tailwindcss.com/)
[![Google Gemini](https://img.shields.io/badge/Google%20Gemini-3.8%20%2F%203.6%20Flash-8E75B2?logo=google)](https://ai.google.dev/)
[![Node.js Tests](https://img.shields.io/badge/Automated%20Tests-32%2F32%20Passing-brightgreen)](https://nodejs.org/api/test.html)
[![Firebase](https://img.shields.io/badge/Firebase-Auth%20%26%20Firestore-FFA611?logo=firebase)](https://firebase.google.com/)

---

## 🏆 1. Chosen Vertical / Challenge

- **Track**: **PromptWars – AI Prompt Challenge (AI VIBEATHON 2026)**
- **Domain**: **LegalTech & Everyday Consumer Protection**
- **Antigravity & Tool Orchestration**: Designed, scaffolded, and optimized using **Google Antigravity**. VetoAI demonstrates structured prompt engineering, multi-model tool orchestration with instant failover, and smart dynamic assistant logic that converts opaque legal boilerplate into plain-English, actionable negotiation leverage.

### The Real-World Problem
Every year, millions of students, freshers, tenants, and consumers enter into binding agreements containing severe, asymmetric traps:
- **Internships & Employment**: Extortionate liquidated damages exit bonds (e.g. ₹2,00,000 penalties for early departure), 50% monthly stipend withholding disguised as "security deposits", 90-day employee notice periods paired with immediate employer termination rights, 2-year post-separation non-competes, and overbroad intellectual property assignment that claims ownership over personal weekend side projects and open-source contributions.
- **Tenancy & Leases**: Mandatory non-negotiable deductions for painting or deep cleaning, security deposit refunds delayed by 90 to 120 days, disclaimers of all landlord structural maintenance obligations, unannounced landlord entry at any hour, and complete forfeiture of deposits upon early departure.
- **SaaS & FinTech Terms**: Unilateral auto-renewals with postal-only cancellation rules, non-refundable charges, broad licenses to sell user data or train proprietary AI models on user content, token liability caps (e.g. ₹250 or one month's fee) combined with immediate data deletion upon termination, and hidden fees or retroactive interest spikes.

Because professional legal consultation costs thousands of rupees and is out of reach for students and renters, predatory clauses often go unnoticed until it is too late. **VetoAI levels the playing field.**

---

## 🧠 2. Approach & Logic

VetoAI departs from traditional "summarize this contract" AI bots by pairing **conditioned prompt engineering** with **multi-tiered model orchestration** and a unique **"negative space"** analysis.

```text
┌────────────────────────────────────────────────────────────────────────┐
│                   Category-Aware Prompt Conditioning                  │
│       Detects: Rental | Internship | SaaS/Fintech | General           │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   Strict JSON Schema Enforcement                       │
│  - overallRisk ("High" | "Medium" | "Low") & riskScore (0 to 100)       │
│  - summary: 1–2 plain-English sentences without legal jargon            │
│  - flaggedClauses: { title, quote, risk, whyItMatters, negotiationLine }│
│  - missingProtections: { title, whyItMatters, askFor }                  │
│  - negotiationEmail: { subject, body }                                  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│              4-Tier Resilient Failover Architecture (Zero 503s)        │
│  Tier 1: Google Gemini 3.8 Flash ──(8s timeout)──> Gemini 3.6 Flash     │
│  Tier 2: Groq Cloud (llama-3.3-70b-versatile, sub-second failover)      │
│  Tier 3: OpenRouter (meta-llama/llama-3.3-70b-instruct:free)            │
│  Tier 4: Deterministic Local Clause Pattern Engine (lib/veto.ts)        │
└────────────────────────────────────────────────────────────────────────┘
```

### Key Innovations:
1. **Category-Aware Prompt Engineering**:
   - Classifies document context dynamically across 4 categories: `rental`, `internship`, `saas_fintech`, and `general`.
   - Each category activates tailored evaluation lenses, focusing the model on the predatory tricks specific to that agreement type.
2. **The "Missing Protections" Innovation (Analyzing What Isn't There)**:
   - Standard AI reviewers only flag predatory text that is present. Predatory contracts often cause the greatest harm through **deliberate omission**.
   - VetoAI actively cross-references the text against standard fairness protections:
     * **Rental**: Explicit 14-day deposit return timeline, landlord structural repair obligations, mutual lease termination notice.
     * **Internship**: Personal side-project carveout for off-duty code, mutual notice safeguard, guaranteed timely monthly stipend release.
     * **SaaS / FinTech**: One-click digital cancellation & pro-rata refunds, 30-day post-termination data export window, fair liability cap.
3. **Strict JSON Schema & Zero Hallucination Guardrails**:
   - The LLM is conditioned with a strict system prompt requiring direct source quotations (`quote`), plain-English impact explanations (`whyItMatters`), and confidence-inspiring counter-arguments (`negotiationLine`).
   - If an LLM returns conversational markdown or malformed JSON, our deserializer automatically extracts and sanitizes the JSON payload.
4. **4-Tier Resilient Fallback Pipeline**:
   - **Tier 1 (Google Gemini 3.8 / 3.6 Flash)**: Primary high-speed reasoning engine with an 8-second timeout per sub-tier.
   - **Tier 2 (Groq Cloud `llama-3.3-70b-versatile`)**: Ultra-fast secondary fallback.
   - **Tier 3 (OpenRouter `llama-3.3-70b-instruct:free`)**: Free third-party provider layer.
   - **Tier 4 (Deterministic Local Clause Engine in `lib/veto.ts`)**: 100% offline, zero-network fallback that uses vetted regex heuristics and category detection. Guarantees that live demos, evaluations, and offline audits **never fail with a 503 error**.

---

## ⚙️ 3. How the Solution Works

```text
[User Input]                [Backend Processing]               [Interactive Dashboard]
  Paste Text                  In-Memory Buffer                   Risk Score Gauge (0-100)
  or Upload File    ──────>   Extraction (unpdf / mammoth) ───>  Flagged Clauses (High-first)
  (.pdf, .docx, .txt)         4-Tier Fallback Engine             Missing Protections Cards
                              JSON Normalization                 Dynamic Counter-Offer Email
                                                                       │
                                                                 Optional Sync
                                                                       ▼
                                                             Firebase Google Auth &
                                                             Firestore Scan History
```

1. **Document Ingestion**:
   - The user pastes text (20 to 15,000 characters) or uploads a document (up to 4 MB).
   - Pre-loaded sample buttons (**"Software Intern Offer"** and **"Residential Lease"**) allow immediate testing with zero setup.
   - Supported file formats include `.pdf`, `.docx`, and `.txt`. Ingestion is handled entirely in-memory using `unpdf` and `mammoth` (zero disk writes, zero file storage).
2. **Document Category Classification**:
   - The document is classified into `internship`, `rental`, `saas_fintech`, or `general` based on legal keyword density.
3. **Multi-Model Risk Audit**:
   - The document is evaluated across the 4-tier pipeline. Each flagged clause is scored for severity (`High`, `Medium`, `Low`).
4. **Interactive Results Dashboard**:
   - **Executive Verdict Banner**: Features an animated circular SVG risk score gauge (0 to 100), severity badge, and high-level verdict summary.
   - **Document Risk Overview**: Displays the total count of concerns, category-filtered distribution bar, and filter tabs (`All`, `High`, `Medium`, `Low`).
   - **Flagged Clauses**: Sorted with High-severity concerns first; cards feature full-text source quotes, plain-English impact explanations ("Why it hurts:"), and ready-to-use pushback phrasing ("Say this:").
   - **Missing Protections**: Cards explicitly identifying fair clauses that were omitted from the text.
5. **Dynamic Negotiation Email Generator**:
   - Automatically generates a category-specific subject line (e.g. *"Proposed Revisions to Internship Offer Letter"* or *"Request for Balanced Residential Lease Terms"*).
   - Generates a numbered, document-specific body citing the exact findings and proposed solutions.
   - 1-click **"Copy email"** and deep-link **"Open Gmail draft"**.
   - If signed in, automatically swaps `[Your Name]` with the user's Google display name.
6. **Optional Firebase Auth & Scan History**:
   - **Guest Access Unblocked**: Zero login required to scan documents.
   - **Google Sign-In**: Click "Sign in with Google" in the top navbar to authenticate with Firebase Auth.
   - **Firestore History**: Automatically saves completed audits to `users/${uid}/scans`.
   - **Saved Scans Drawer**: A slide-over panel allows users to view and reload past audits with a single click.

---

## 📝 4. Assumptions Made

1. **Educational Review, Not Legal Representation**:
   - VetoAI provides educational risk identification and negotiation awareness. It is not an attorney and does not create an attorney-client relationship. Clear disclaimers are visible in the header, results, and footer.
2. **Text-Based Document Ingestion**:
   - Assumes uploaded `.pdf` documents contain a digital text layer readable by `unpdf`. Image-only scans without OCR text layers require users to paste the document text.
3. **In-Memory Zero-Retention for Guest Privacy**:
   - For guest users, uploaded buffers and parsed contract texts are processed strictly in RAM and immediately discarded. No document data is stored on disk or server databases.
4. **Optional Cloud Persistence**:
   - Document history persistence in Firestore is strictly opt-in via Google Sign-In. If Firebase environment variables are omitted, the application runs seamlessly in guest mode with zero console errors or build breaks.
5. **Safe Payload Limits**:
   - File uploads are capped at **4 MB** and text length at **15,000 characters** (approx. 20 pages) to ensure sub-second parsing and protect against Denial-of-Service (DoS) memory exhaustion.

---

## 🛡️ 5. Security, Accessibility & Testing

### Defensive Security Posture
- **HTTP Security Headers** (`next.config.ts`):
  - `X-Content-Type-Options: nosniff` — prevents MIME-type sniffing exploits.
  - `X-Frame-Options: DENY` — prevents clickjacking and unauthorized iframe embedding.
  - `Referrer-Policy: strict-origin-when-cross-origin` — protects user privacy across external links.
- **Strict File & Ingestion Bounds**: Enforces extension whitelisting (`.pdf`, `.docx`, `.txt`), MIME validation, and buffer length bounds.
- **Zero Disk Persistence**: Document parsing is executed in-memory via Node `Buffer` and `Uint8Array`.

### Accessibility (WCAG 2.1 AA Compliant)
- **Semantic Structure**: Proper `<header>`, `<main>`, `<section>`, `<article>`, and `<footer>` layout.
- **ARIA Live Regions**: `aria-live="polite"` announces dynamic audit results to screen readers; `role="region"` and `role="alert"` guide assistive tech.
- **Keyboard Navigation & Contrast**: Visible focus rings (`focus-visible:ring-2 focus-visible:ring-[#6CA8FF]`), logical tab indices, and high-contrast text ratios exceeding WCAG AA requirements on obsidian backgrounds.

### Automated Testing (`npm test` — 32 / 32 Passing)
Built with Node's native test runner (`node:test` and `node:assert/strict`) for rapid, dependency-free test execution:

```bash
npm test
```

```text
▶ Input Validation & Security Bounds (7 tests)
  ✔ rejects non-string inputs
  ✔ rejects inputs below minimum character threshold
  ✔ accepts inputs meeting character bounds
  ✔ flags text exceeding maximum safe bounds and provides truncated text
  ✔ validates file sizes and enforces 4 MB limit
  ✔ validates file extensions
  ✔ validates MIME types when provided

▶ JSON Extraction & Malformed Model Handling (4 tests)
  ✔ extracts pure JSON object
  ✔ extracts JSON enclosed within markdown code fences
  ✔ extracts JSON embedded inside conversational text
  ✔ throws error when no valid JSON is present

▶ Deterministic Local Clause-Pattern Analyzer (13 tests)
  ✔ flags internship exit bonds and financial penalties
  ✔ flags stipend withholding and deposit traps
  ✔ flags asymmetric 90-day notice vs immediate termination
  ✔ flags personal IP grab on weekend side projects
  ✔ flags rental deposit forfeiture, painting deductions, and unannounced entry
  ✔ identifies missing standard protections
  ✔ detects document categories accurately from legal keywords
  ✔ flags saas_fintech auto-renewal and postal cancellation trap
  ✔ flags saas_fintech unrestricted data sharing and AI model training
  ✔ flags saas_fintech tiny liability cap and immediate data deletion without export window
  ✔ flags saas_fintech hidden fees, retroactive interest spikes, and auto-debit without notice
  ✔ enforces strict category-specific missing protections
  ✔ generates dynamic category-specific negotiation email with numbered findings

▶ Output Normalization & Resilient Sanitization (3 tests)
  ✔ clamps out-of-range risk scores to 0-100
  ✔ provides safe fallbacks for missing or malformed fields
  ✔ falls back completely to local analysis on null or corrupted input

▶ Severity Normalization, Sorting & Filtering Logic (4 tests)
  ✔ normalizes standard severities accurately
  ✔ handles missing or unrecognized severity as Unrated without silently coercing to Low
  ✔ ranks severities strictly: High (1) -> Medium (2) -> Low (3) -> Unrated (4)
  ✔ sorts mixed findings with High concerns first while preserving original order within tiers

▶ Firebase Safe Fallbacks & Guest Mode (1 test)
  ✔ reports isFirebaseConfigured false when env vars are absent

ℹ tests 32 | suites 6 | pass 32 | fail 0
```

---

## 💻 Tech Stack

- **Framework**: Next.js 16.4 (App Router, Turbopack, React 19)
- **Language**: TypeScript 5 (Strict Mode, 100% typed, zero `any`)
- **Styling**: Tailwind CSS v4 (Glassmorphic dark design: Obsidian `#07090D`, Electric Lime `#D2F54B`, Cobalt Blue `#6CA8FF`)
- **AI Models & Orchestration**:
  - Primary: Google Gemini 3.8 Flash & Gemini 3.6 Flash (`@google/genai`)
  - Secondary: Groq Cloud (`llama-3.3-70b-versatile`)
  - Tertiary: OpenRouter (`meta-llama/llama-3.3-70b-instruct:free`)
  - Provider #4: Deterministic Local Clause Engine (`lib/veto.ts`)
- **Authentication & Database (Optional)**: Firebase Auth (Google Sign-In) & Cloud Firestore (`firebase ^13.4.0`)
- **Document Extractors**: `unpdf` (PDF parsing), `mammoth` (DOCX parsing)
- **Test Framework**: Native Node.js Test Runner (`node:test`, `node:assert/strict`)

---

## 🚀 Getting Started

### 1. Clone & Install
```bash
git clone https://github.com/Mithun616/veto-ai.git
cd veto-ai
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Add your API credentials (all are optional thanks to the Tier 4 deterministic local fallback):
```env
GEMINI_API_KEY=your_gemini_api_key_here
GROQ_API_KEY=your_groq_api_key_here
OPENROUTER_API_KEY=your_openrouter_api_key_here

# Firebase Google Sign-In & Firestore Scan History (Optional)
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain_here
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id_here
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket_here
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id_here
NEXT_PUBLIC_FIREBASE_APP_ID=your_firebase_app_id_here
```

### 3. Run & Verify
```bash
# Run automated test suite (32 tests)
npm test

# Run ESLint (0 errors, 0 warnings)
npm run lint

# Build production bundle with Turbopack
npm run build

# Start production server
npm start

# Or start development server
npm run dev
```

---

## ⚖️ Legal Disclaimer

VetoAI is an automated document review tool designed to promote negotiation awareness and contract readability for students, tenants, and consumers. It does not provide legal representation, legal advice, or attorney-client privilege. Users should always consult a licensed attorney in their jurisdiction for binding legal matters.
