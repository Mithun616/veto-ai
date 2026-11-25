# VetoAI — Document Risk Review & Pushback Drafts

> **Educational Document-Risk Reviewer • Not Legal Advice**  
> *Review offers, leases, and terms for concerning clauses and missing protections—then draft a respectful response.*

[![Next.js](https://img.shields.io/badge/Next.js-16.4-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?logo=react)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v4-38bdf8?logo=tailwind-css)](https://tailwindcss.com/)
[![Google Gemini](https://img.shields.io/badge/Google%20Gemini-3.8%20Flash-8E75B2?logo=google)](https://ai.google.dev/)

---

## 📌 Overview

Every year, students, freshers, tenants, and consumers are presented with long, complex agreements that contain unbalanced terms:
- **Internships & Employment**: Uncapped training bonds, stipend withholding, 90-day unilateral notice requirements, and overreaching intellectual property assignments on personal side projects.
- **Tenancy & Leases**: Mandatory non-refundable deductions, 90–120 day security deposit refund delays, zero landlord repair commitments, and immediate eviction clauses.
- **Freelance & Services**: Unlimited indemnification, indefinite payment holdbacks, and global non-compete clauses.

**VetoAI** serves as an accessible educational tool to review documents for high-risk clauses, highlight missing standard protections, and generate polite, professional negotiation drafts.

---

## ✨ Features

1. **Document Workspace (Paste & Upload)**:
   - Paste contract text with live character counter (minimum 20 characters threshold).
   - Drag-and-drop or select text-based `.pdf`, `.docx`, or `.txt` documents up to 4 MB.
   - 1-click sample loaders for Internship and Rental contracts that populate the workspace without auto-submitting.
   - Clear input action to reset state.
   - Explicit file support disclosure: scanned image PDFs without selectable text are not supported.

2. **Honest Analysis Indicator**:
   - Clean, non-distracting progress indicator ("Reviewing your document…") with no simulated percentages or fake stages.
   - Fully supports `prefers-reduced-motion` for accessibility.

3. **Results Dashboard**:
   - **Risk Overview**: Overall risk classification (Low, Medium, High), 0–100 risk score meter, executive summary, and explicit legal indicator notice.
   - **Flagged Clauses**: Clause title, severity badge, source excerpt, plain-English concern ("Why it matters:"), and ready-to-use counter-statement ("Suggested pushback:") with 1-click copy.
   - **Missing Protections**: Standard terms not found in the provided text (e.g. deposit return deadlines, mutual termination notice, repair responsibilities) with suggested addition clauses.
   - **Negotiation Email**: AI-drafted diplomatic counter-proposal with verified "Copy email" action and direct "Open Gmail draft" deep-link.
   - **Stale State Warning**: Visual alert if the user modifies document text after an audit was already completed.

4. **Educational Disclaimer**:
   - Clear, persistent disclosures across the header, overview, and footer stating that VetoAI is an automated review assistant, not an attorney or substitute for legal counsel.

---

## 🏗️ Technical Architecture

```text
┌────────────────────────────────────────────────────────┐
│   Frontend Workspace (app/page.tsx)                    │
│  - Modular components in app/components/               │
│  - Document upload / paste with validation (min 20 ch) │
│  - Stale state detection on edits                      │
│  - Accessible ARIA status and focus management         │
└───────────────┬────────────────────────────────────────┘
                │ POST /api/analyze
                │ (multipart/form-data or application/json)
                ▼
┌────────────────────────────────────────────────────────┐
│   Next.js API Route (app/api/analyze/route.ts)         │
│  - File validation (<= 4 MB) & text length checks      │
│  - DOCX text extraction via mammoth                    │
│  - PDF native analysis + unpdf text extraction fallback│
│  - Resilient Provider Cascade:                         │
│    1. Google Gemini 3.8 / 3.6 Flash                    │
│    2. Groq (llama-3.3-70b-versatile)                   │
│    3. OpenRouter (llama-3.3-70b-instruct)              │
│    4. Deterministic Local Clause Pattern Engine        │
└───────────────┬────────────────────────────────────────┘
                │ Typed Structured JSON
                ▼
┌────────────────────────────────────────────────────────┐
│   Results Presentation                                 │
│  - RiskOverview (score, level, summary)                │
│  - ClauseCard list with source quotes & pushback copy  │
│  - MissingProtectionCard list with suggested clauses   │
│  - NegotiationEmailCard (Copy / Open in Gmail)         │
└────────────────────────────────────────────────────────┘
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository and install dependencies:
   ```bash
   git clone https://github.com/your-username/veto.git
   cd veto
   npm install
   ```

2. Configure environment variables in `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
   Add your API keys:
   ```env
   GEMINI_API_KEY=your_gemini_api_key
   # Optional fallbacks:
   GROQ_API_KEY=your_groq_api_key
   OPENROUTER_API_KEY=your_openrouter_api_key
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

4. Build for production:
   ```bash
   npm run build
   npm run start
   ```

---

## 🛡️ Privacy & Legal Disclaimer

- **Privacy**: VetoAI advises users to remove sensitive personal details (such as names, phone numbers, and bank account numbers) prior to analysis. Document text is transmitted securely to the configured AI API provider for processing and is not permanently persisted on VetoAI servers.
- **Legal Notice**: VetoAI is an automated software tool intended solely for educational, informational, and negotiation awareness purposes. It does not provide legal representation, legal advice, or attorney-client privilege.
