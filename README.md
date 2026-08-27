# ORBIIS

**Before you commit to a research idea, try to break it.**

ORBIIS is a research contribution intelligence tool. You describe a proposed research
idea; it reconstructs the contribution, retrieves real papers from Semantic Scholar,
identifies the closest existing work, actively hunts for "novelty collisions,"
generates reviewer-style objections, and suggests refinements — all with every
literature-backed claim traceable to a real, verifiable paper.

AI (Gemini, via `backend/src/lib/ai.ts`) is used only to *reason over* retrieved
papers — never as a source of papers, citations, or facts. Every paper shown in the
UI comes from a live Semantic Scholar API call.

## Project layout

```
orbiis/
  backend/     Node + Express + TypeScript API, Prisma/PostgreSQL, Semantic Scholar + Gemini calls
  frontend/    React + TypeScript + Vite UI
```

## 1. Backend setup

```bash
cd backend
cp .env.example .env
```

Edit `.env`:

```
SEMANTIC_SCHOLAR_API_KEY=        # optional — improves rate limits, MVP works without it
AI_PROVIDER=gemini
AI_API_KEY=your_gemini_api_key   # required — https://aistudio.google.com/apikey
AI_MODEL=gemini-2.0-flash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/orbiis
PORT=8787
```

Then:

```bash
npm install
npx prisma migrate dev --name init   # creates the Postgres schema (requires a running Postgres)
npm run dev                          # starts the API on http://localhost:8787
```

If you don't have Postgres running locally, the quickest option is:

```bash
docker run --name orbiis-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=orbiis -p 5432:5432 -d postgres:16
```

## 2. Frontend setup

```bash
cd frontend
npm install
npm run dev     # starts the UI on http://localhost:5173, proxying /api to :8787
```

Open http://localhost:5173.

## Report structure

The flow now has two phases:

1. **Understand & confirm.** Submitting an idea calls `POST /api/decompose`
   (stateless, one AI call) and shows a "Here's what ORBIIS understood" screen.
   Every one of the 8 extracted fields (research question, domain, problem,
   method, population, data, context, outcome) is one of three states —
   `explicit` (the researcher said it), `inferred` (conservatively implied, with
   a stated reason), or `unknown` (genuinely absent — never guessed at). The
   researcher can edit any field before continuing; editing a field marks it
   explicit, leaving it untouched preserves ORBIIS's original status.
2. **Run the stress test.** Confirming calls `POST /api/stress-test` with the
   (possibly edited) structured idea, which skips re-running decomposition and
   runs calls 2–8 of the pipeline directly.

The results page leads with a decision-oriented summary (status, biggest issue,
strongest overlap, what may be differentiated, what to investigate next), then
the detailed report below it:

1. Your proposed contribution (now shows Not specified / Inferred / stated-by-you per field)
2. Contribution map (each row now links its supporting evidence, or says "no evidence linked")
3. Closest existing work
4. Potential overlap to investigate
5. Try to break this contribution
6. Potential differentiation (established / possible differentiation / but what must be proven)
7. Strengthen the research idea
8. Research decision (`proceed` / `refine` / `rethink` / `insufficient_evidence` — one field, drives both the top summary pill and this closing section, so they can't disagree)
9. Evidence (full retrieved paper list, filterable)

A print/export button (`window.print()`) is available at the top of the results page.

## Manual verification / smoke tests

- `frontend/devtest/renderResults.tsx` SSR-renders the Results page against 8 mock
  datasets (overlap case, no-overlap case, AI-only objection, literature-backed
  objection, missing/unknown fields, no evidence, and both `insufficient_evidence`
  and `rethink` decisions) and checks the output never contains banned words like
  "novel" or "no collision."
- `frontend/devtest/renderConfirmIdea.tsx` SSR-renders the new confirmation screen
  against mixed explicit/inferred/unknown data, including the all-unknown-except-domain
  case that prompted this redesign.
- `backend/devtest/sanitize-problem.test.ts` unit-tests `sanitizeStructuredIdea`'s
  handling of the `problem` field against the spec examples (explicit problem
  embedded in a subordinate clause, inferred problem, unknown/bare-topic case) and
  fuzzes the `status: "unknown" ⇒ value: null` invariant. This only tests the
  sanitization/coercion code — it does not call the live AI, so it cannot confirm
  Gemini actually extracts these fields correctly on real input; only a live run
  can confirm that. To run it:

  ```bash
  cd backend
  npx tsc devtest/sanitize-problem.test.ts --outDir .devtest-build --module commonjs --target ES2020 --esModuleInterop --skipLibCheck --resolveJsonModule
  node .devtest-build/devtest/sanitize-problem.test.js
  rm -rf .devtest-build
  ```

These are fast regression checks for crashes and copy regressions — not a
substitute for the real benchmark in `BENCHMARK.md`. To run either:

```bash
cd frontend
npm install
npx --yes esbuild devtest/renderResults.tsx --bundle --platform=node --format=cjs --jsx=automatic --outfile=/tmp/smoke.cjs && node /tmp/smoke.cjs
npx --yes esbuild devtest/renderConfirmIdea.tsx --bundle --platform=node --format=cjs --jsx=automatic --outfile=/tmp/smoke2.cjs && node /tmp/smoke2.cjs
```

## Notes on the AI abstraction

`backend/src/lib/ai.ts` exposes a single `generateStructured` interface. The MVP
implements it with Gemini (`@google/generative-ai`, using JSON response mode), selected
via `AI_PROVIDER=gemini`. To swap providers later, add a new class implementing
`AIProvider` and branch on `AI_PROVIDER` in `buildProvider()` — nothing in the pipeline
(`backend/src/pipeline/*.ts`) needs to change.

## Pipeline

Each numbered file in `backend/src/pipeline/` is one constrained AI call (or, for
retrieval, a deterministic non-AI step) in the sequence described in the product spec:

1. `1-decompose.ts` — structure the raw idea into a JSON contribution profile, with every field marked explicit/inferred/unknown; also exports `sanitizeStructuredIdea` used to validate both AI output and client-submitted edits from the confirmation screen
2. `2-collision-queries.ts` — generate adversarial search queries
3. `3-retrieve.ts` — call Semantic Scholar, deduplicate, deterministically rank/filter
4. `4-closest-work.ts` — select + rate the 5–10 closest papers
5. `5-contribution-map.ts` — dimension-by-dimension overlap map
6. `6-collisions.ts` — novelty collision detection (evidence-gated)
7. `7-reviewer-attack.ts` — reviewer objections (evidence-gated)
8. `8-refinement.ts` — refinement suggestions (weakness/what-to-change/testable question/what-would-establish-it), the established/possible-differentiation/what-must-be-proven synthesis, the biggest issue and next-step for the top summary, and the single `researchDecision`

`orchestrate.ts` runs the full sequence and persists idea/paper/analysis rows.

Every paper index the AI references is validated server-side in `lib/validation.ts`
before it's trusted — invalid indices are dropped, never guessed at.

## What's intentionally out of scope for this MVP

Per spec: no auth, no payments, no teams, no Zotero/Mendeley, no citation manager,
no systematic review workflow. Idea iteration ("Refine this idea") is session-based
only — versions live in Postgres per session but there's no account system.
