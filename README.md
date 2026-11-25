# VetoAI

### Evidence-backed document-risk review and respectful negotiation drafts.

Built with Google Antigravity for **AI VIBEATHON 2026 — PromptWars**.

VetoAI helps students, freshers, renters, and everyday consumers review offers, leases, and terms before signing. It highlights potentially concerning clauses, identifies relevant protections not found in the supplied text, and prepares a respectful negotiation email.

> Educational document-risk review—not legal advice. Findings may be incomplete or incorrect and require human review.

## Live Demo

The public deployment URL will be added here after production deployment and verification.

For local development, open `http://localhost:3000` after starting the application.

## Problem and Target Users

Important agreements are often difficult to understand. Students and consumers may encounter financial penalties, unclear payment terms, one-sided obligations, or broad ownership provisions without understanding their practical consequences.

A generic summary may explain an agreement without helping the reader locate the concerning language or decide what to ask before signing.

VetoAI connects three actions:

1. Identify a potentially concerning term and show its source excerpt.
2. Explain the practical concern in plain language.
3. Suggest a respectful question or proposed revision.

### Example use cases

| User | Document | Questions VetoAI helps surface |
|---|---|---|
| Student or fresher | Internship or employment offer | Are payment terms clear? Is an exit penalty specified? Could an IP clause affect personal projects? |
| Tenant | Rental or accommodation agreement | Are deposit deductions explained? Is a refund process stated? How are access and repairs handled? |
| Consumer or freelancer | Subscription or service agreement | How does cancellation work? Can charges change? What happens to data after termination? |

These are review questions, not conclusions that a clause is unlawful or unenforceable.

## What Works

### Document input

- Paste between **20 and 15,000 characters**.
- Upload a text-based **PDF, DOCX, or TXT** file up to **4 MB**.
- Extracted text remains subject to the character limit.
- Oversized text is rejected rather than silently truncated.
- Load internship and rental samples without creating an account.

### Structured review

- Potentially concerning clauses with source excerpts.
- Plain-English explanations and suggested negotiation lines.
- Context-relevant protections not found in the supplied text.
- An AI-generated review indicator and severity distribution.
- Severity filters and expandable finding cards.

### Actionable response

- A negotiation email assembled from accepted findings and relevant missing-protection questions.
- Copy individual negotiation lines or the complete email.
- Open a prefilled Gmail draft without automatically sending it.

### Optional saved history

When Firebase is configured and history is enabled:

- Sign in with Google.
- Save completed reviews under the authenticated user’s account.
- Reload saved reviews from the history drawer.
- Delete saved records.

Guest document review does not require Firebase sign-in.

## Quick Demo

1. Open the application and select the internship sample.
2. Choose **Review document**.
3. Expand a flagged clause and compare its source excerpt with the explanation.
4. Inspect **Protections not found in this text**.
5. Review and copy the negotiation email.

Repeat with the rental sample to see a different document context.

To inspect stale-result handling, edit the document after analysis. The application marks the previous review as stale and locks its email actions until a fresh review is completed.

## Architecture

```text
Pasted text or supported file
             |
             v
Next.js document-review interface
             |
             v
/api/analyze
  - Request validation
  - Input and file-size limits
  - Best-effort rate limiting
  - Text extraction
             |
             v
Configured AI provider
  - Primary provider request
  - Bounded sequential fallback when configured
  - Structured output request
             |
             v
Response normalization and integrity checks
  - Runtime field validation
  - Source-excerpt verification
  - Heuristic evidence-alignment checks
  - Unsupported-finding exclusion
             |
             v
Accepted review results
  - Risk overview
  - Flagged clauses
  - Missing-protection questions
  - Negotiation email
             |
             +----> Optional Firebase saved history
```

### Main implementation areas

| Location | Responsibility |
|---|---|
| `app/page.tsx` | Workspace state, submissions, request cancellation, and stale-result handling |
| `app/api/analyze/route.ts` | Server-side provider requests, request limits, and controlled errors |
| `lib/veto.ts` | Analysis types, normalization, source checks, severity handling, and email assembly |
| `lib/rateLimit.ts` | Best-effort per-runtime request limiting |
| `lib/firebase.ts` | Optional Firebase authentication and saved-history integration |
| `app/components/` | Document workspace, overview, finding cards, and email interface |
| `firestore.rules` | Proposed access and validation rules for saved scans |
| `tests/` | Deterministic tests, rules checks, and optional environment-dependent tests |
| `.github/workflows/ci.yml` | Automated verification on repository changes |

### AI provider orchestration

The server supports configured providers through Google Gemini, Groq, and OpenRouter.

Provider requests use bounded timeouts and sequential fallback. Available providers depend on the environment variables configured for the deployment. The source code is the reference for current model identifiers, provider order, and timeout settings.

At least one supported AI provider must be configured for AI review.

Provider failure does not trigger a fabricated successful review. If analysis cannot be completed or validated, the application presents an error or incomplete-review state.

## Analysis Integrity

### Source-backed findings

Flagged clauses are checked against the submitted document text. Findings whose quoted evidence cannot be verified are excluded from the accepted clause list.

Source verification allows conservative text normalization, such as whitespace and quotation-mark differences.

A matching excerpt establishes that the text appears in the supplied document. It does not establish that the explanation is legally correct.

### Heuristic alignment checks

Additional checks attempt to detect some mismatches between an excerpt and its explanation, including unrelated document categories.

These checks are heuristic. They cannot guarantee that every explanation logically follows from its source or captures all relevant context.

### Missing protections

Missing-protection findings are presented as information not found in the supplied text.

They may appear elsewhere in the full agreement. Suggested additions are contextual negotiation proposals—not universal legal requirements or guarantees of entitlement.

### Incomplete reviews

Unsupported findings are omitted, and the interface indicates when a review is incomplete.

An absence of accepted findings does not guarantee that an agreement is fair, safe, complete, or legally enforceable.

### Consistent negotiation drafts

Negotiation drafts are assembled from accepted findings and relevant missing-protection questions.

The displayed email, copied email, and Gmail draft use the same underlying content. Users should review and personalize the draft before sending it.

## Tech Stack

| Area | Technology |
|---|---|
| Application | Next.js App Router and React |
| Language | TypeScript |
| Styling | Tailwind CSS |
| AI integration | Google GenAI SDK and configured provider integrations |
| PDF extraction | `unpdf` |
| DOCX extraction | `mammoth` |
| Optional authentication | Firebase Authentication |
| Optional saved history | Cloud Firestore |
| Automated tests | Node.js native test runner |
| Continuous integration | GitHub Actions |
| Deployment | Vercel |

Exact dependency versions are recorded in `package.json` and `package-lock.json`.

## Run Locally

### Requirements

- Node.js 20 or later.
- npm.
- At least one supported AI-provider API key.
- Optional Firebase configuration for authentication and saved history.

CI uses Node.js 22.

### 1. Clone and install

```bash
git clone [https://github.com/Mithun616/veto-ai.git](https://github.com/Mithun616/veto-ai.git)
cd veto-ai
npm ci
```

### 2. Create the environment file

```bash
cp .env.example .env
```

On Windows, copy `.env.example` to `.env` using your editor or file manager.

Configure the variables used by the application.

### AI-provider variables

| Variable | Purpose |
|---|---|
| `GEMINI_API_KEY` | Enables the Google Gemini provider |
| `GROQ_API_KEY` | Enables the Groq provider |
| `OPENROUTER_API_KEY` | Enables the OpenRouter provider |

Configure at least one provider. Additional configured providers may be used for fallback.

```env
# Configure at least one supported AI provider.
GEMINI_API_KEY=
GROQ_API_KEY=
OPENROUTER_API_KEY=
```

Provider credentials must remain server-side. Do not prefix them with `NEXT_PUBLIC_` or commit their values.

### Optional Firebase variables

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

Firebase configuration enables optional Google sign-in and saved-history features. Guest analysis remains available without Firebase configuration.

Firebase client configuration is not a substitute for authorization. Saved records require correctly deployed Firestore Security Rules.

### 3. Start development

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

### 4. Build and run production locally

```bash
npm run build
npm start
```

## Quality and Verification

| Evaluation area | Implementation evidence | Verification approach |
|---|---|---|
| Code quality | TypeScript checking, shared analysis types, coherent finding objects, runtime response validation | Lint, production build, normalization and cohesion tests |
| Efficiency | Input limits, duplicate-submit prevention, bounded provider fallback, lightweight text-based samples | Request-flow tests and production smoke testing |
| Accessibility | Labelled controls, keyboard-operable interactions, severity text and icons, reduced-motion support | Automated checks and manual keyboard/browser review |
| Security | Server-side provider credentials, safe text rendering, input validation, request limiting, security headers | Dependency audit, validation tests, configuration review |
| Testing | Deterministic tests, optional provider tests, Firestore rules checks, CI | Repeatable test commands with passed/skipped results reported separately |
| Problem alignment | Source-backed concerns, contextual omissions, plain-English explanations, negotiation drafts | Internship/rental walkthroughs and regression scenarios |

No automated score is presented as proof of complete accessibility, security, legal accuracy, or production reliability.

## Tests and Production Build

### Standard checks

```bash
npm run lint
npm test
npm run build
```

### Production dependency audit

```bash
npm audit --omit=dev
```

### Latest recorded local verification

| Check | Recorded result |
|---|---|
| Lint | 0 errors, 0 warnings |
| Automated tests | 58 total: 51 passed, 7 skipped, 0 failed |
| Production build | Passed |
| Production dependency audit | 0 reported vulnerabilities |

These results describe the recorded release check, not a guarantee about future dependency advisories or every deployment environment.

### Test scope

The test suite covers areas including:

- Input bounds and file validation.
- Model-output extraction and normalization.
- Source support and finding consistency.
- Severity sorting and filtering.
- Negotiation email assembly.
- Request race and stale-result protection.
- Rate limiting.
- Clipboard failure handling.
- Saved-scan serialization and rules logic.

### Environment-dependent tests

The recorded test run skipped:

- One live-provider smoke test requiring provider credentials.
- Six Firestore emulator tests requiring a compatible Java environment and running emulator.

The local release environment did not meet the emulator’s Java requirement.

Deterministic rules-logic tests do not replace Firestore emulator tests or verification of deployed production rules.

### Browser verification

Browser smoke checks complement the automated suite. The core release walkthrough includes:

1. Loading a sample.
2. Completing analysis.
3. Inspecting findings.
4. Editing input and checking stale-state behavior.
5. Reviewing email actions.

Mocked automated tests do not establish live-provider availability or correctness.

## Security

### Provider credentials

AI-provider keys are read by the server-side analysis route and must not be included in browser bundles or tracked environment files.

### Input and output handling

- Text and file limits are enforced before analysis.
- Unsupported or malformed inputs receive controlled errors.
- Findings are rendered as text rather than executable HTML.
- Email subject and body are URL-encoded for Gmail draft links.
- Failed analysis is not replaced with canned successful findings.

### Rate limiting

The application includes best-effort in-memory request limiting.

This state is local to a runtime instance. It is not a globally shared limit across serverless instances and does not replace platform-level abuse protection or provider spending limits.

### Saved-history authorization

Saved scans use paths under:

```text
users/{userId}/scans/{scanId}
```

Production access must be protected by correctly deployed Firestore Security Rules.

A rules file in the repository does not prove that the same rules are deployed. Review and test the target Firebase project before enabling production saved history.

Client-created history is a convenience feature, not a server-certified or tamper-proof audit trail.

## Privacy and Data Handling

### AI processing

Submitted document text is sent to a configured AI provider for analysis. If provider fallback is used, another configured provider may also receive the text.

Provider-side processing and retention depend on the applicable service terms and configuration. VetoAI does not claim end-to-end zero retention across external providers.

### Guest use

The application is designed not to persist guest review contents to Firebase.

Document parsing and analysis use temporary application memory. This description does not make guarantees about external provider systems, hosting infrastructure, or browser memory.

### Signed-in history

When optional saved history is enabled, completed reviews may be saved to Firestore.

Saved information can include:

- A document title, filename, or short text snippet.
- Risk labels and the review indicator.
- A summary.
- Quoted source clauses.
- Explanations and suggested negotiation language.
- Missing-protection questions.
- A negotiation email draft.
- Timestamps.

These fields can contain sensitive information even when the complete original document is not intentionally stored.

Signing in enables saved-history functionality. Review the interface’s saving behavior before submitting sensitive content.

### Sensitive documents

Remove unnecessary personal information before analysis, including identity numbers, bank details, private addresses, signatures, and confidential business information.

## Accessibility

The interface includes:

- Programmatically labelled document controls.
- Keyboard-operable input and disclosure interactions.
- Visible focus indicators.
- Severity labels and icons in addition to color.
- Accessible loading and error feedback.
- Reduced-motion support.
- Responsive layouts.

These measures support accessibility but do not constitute a claim of independently verified WCAG conformance.

## Known Limitations

- AI-generated findings can be incorrect, incomplete, or contextually inappropriate.
- Source matching does not prove semantic or legal correctness.
- Evidence-alignment checks are heuristic.
- Risk scores are review indicators, not validated probabilities of harm or legal outcomes.
- Missing protections may appear elsewhere in the complete agreement.
- Legal interpretation depends on jurisdiction, circumstances, and the complete document.
- Image-only PDFs require OCR outside the supported text-extraction workflow.
- Files over 4 MB and text over 15,000 characters are rejected.
- Provider availability, quotas, and network conditions affect analysis.
- Cancelling a browser request does not guarantee cancellation of processing or billing at an external provider.
- Production Firebase rules require separate deployment and verification.

## Deployment

The application is intended for deployment on Vercel.

1. Push the reviewed code to the public GitHub repository.
2. Import the repository into Vercel.
3. Configure at least one supported AI-provider key.
4. Add optional Firebase configuration if those features are enabled.
5. Deploy and test the production URL in a signed-out browser.
6. Update the Live Demo section with the verified public URL.

Never use a localhost address as the public submission URL.

## Educational Disclaimer

VetoAI is an automated educational review assistant. It promotes document readability and negotiation awareness.

It does not provide legal advice, legal representation, an attorney-client relationship, or attorney-client confidentiality.

Review the original agreement and verify important findings independently. Consult a qualified legal professional in the relevant jurisdiction when legal advice is needed.
