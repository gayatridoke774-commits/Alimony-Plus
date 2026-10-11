# Alimony Plus frontend

Next.js App Router, React, TypeScript, Tailwind CSS 4 and Lucide icons. A responsive case workspace with a synthetic demonstration and an adapter to the existing Express backend.

## Run locally

Use Node.js 20.9 or newer (verified here with Node 24).

```sh
cd frontend
npm ci
npm run dev
```

Open http://127.0.0.1:3000. The default workspace uses fictional data as of 9 October 2026. Demo edits, uploaded file objects and structured-data drafts live only in React memory and clear on refresh. No case content or auth tokens are written to localStorage/sessionStorage. Navigate with the app links to retain your current session.

## Connect to the backend

Copy `.env.example` to `.env.local`, set `BACKEND_URL` to the trusted Express service origin, then restart Next.js. The default is `http://127.0.0.1:5000`. Configure and run the backend separately using its database and secret requirements. Use **Connect your account** to register/sign in.

The Next.js server proxies a fixed allowlist of existing API routes. Successful login stores the backend JWT in an HTTP-only, SameSite=Strict cookie, with Secure in production. The JWT is never exposed in the client login response. Writes require the same Origin as the Next.js request. Use HTTPS for production; configure reverse proxies to preserve the public request origin. `BACKEND_URL` is server-only and must never use an untrusted user-supplied URL.

Live records are fetched from cases → proceedings → orders → payments. Failure is shown with retry; the app never substitutes demo records for failed live requests. Authentication itself can succeed while a later case fetch fails; that state remains visibly connected with an error. A full page reload opens the labeled demo and requires sign-in to re-enter live mode. Sign-out clears the cookie. The UI clears live in-memory records after 15 minutes of inactivity; the backend token retains its existing expiry. Quick exit requests sign-out and navigates away, but cannot erase history, downloads or revoke a token server-side.

## Implemented screens

- Overview: filtered case metrics, monthly demo chart, next event, case cards and activity.
- Cases: create case, add proceeding, timeline, case search and filtering; demo event entry.
- Court orders: create/read order records; monthly scheduling in demo only.
- Maintenance: create/read receipts; demo ledger handles partial payments, overdue periods and unapplied credits. JSON case/ledger export.
- Documents: upload/download via existing endpoints; demo files retained in memory; readiness by category.
- Planning calculator: versioned scenarios and visible limitations. Live calculations use `/api/calculator/run`; demo mirrors its v1.0 formula.
- Data workspace: editable legal-source and financial-fact records, provenance, review dates, known/estimated/unknown state, JSON handoff with annual-to-monthly normalization. This is session-only preparation, not a connected RAG pipeline.
- Help: official NALSA/eCourts links, lawyer questions and safety/quick-exit explanation.
- Settings and sign-in/registration.

## Important integration boundaries

The repository backend does not currently support payment schedules, effective dates, due days, payment-period allocation, hearing events, document listing, source review or AI chat. Live mode does not fabricate these capabilities. It records supported order/payment fields and shows explicit unavailable states for reconciliation. Only documents uploaded during the current live session can be listed until a document-list endpoint is added; existing documents remain on the server.

The existing calculator accepts applicant liabilities but does not apply them in its formula. The UI exposes this limitation. Its 75%/125% scenario multipliers are budget assumptions, not legal percentages. Unknown values cannot be entered as known zero without deliberate user input. All entered expense categories should be mutually exclusive.

No modifications were made to backend business logic. Its deployment, authentication lifecycle, authorisation, file validation and data handling still need the backend team's review before production. English UI is implemented; full Hindi/Hinglish localisation and a source-cited AI service are not part of this frontend integration yet.

See [API-HANDOFF.md](API-HANDOFF.md) for required backend extensions and AI data contracts.

## Verification

```sh
npm run typecheck
npm test
npx playwright install chromium
npm run test:e2e
npm run build
```

Vitest checks reconciliation and normalization edge cases. Playwright covers desktop/mobile routes, case → proceeding → order creation, payment changes, data exports, calculator invalidation, keyboard dismissal and error states. Screenshots are saved in ignored `test-results/`.

The interface uses semantic forms/tables, native dialog focus trapping, keyboard focus styles, a skip link, reduced-motion handling and textual statuses alongside colour. Production build and frontend tests do not establish legal correctness or backend readiness.
