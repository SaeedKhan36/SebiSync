# RegLens AI — SEBI Regulatory Compliance Copilot

RegLens AI turns a SEBI circular (60 pages of regulatory prose) into tracked,
auditable compliance obligations for intermediaries — automatically extracted,
human-verified, fanned out to every affected entity, and monitored for gaps —
without ever letting a machine publish a rule unsupervised.

Built for **SEBI Securities Market Hackathon / IDBI Innovate** under the theme
of AI-assisted regulatory compliance (see `docs/pitch/` for the deck variants).

## The problem

Every new SEBI circular creates work: someone has to read it, figure out which
obligations apply to which type of intermediary (Investment Adviser, Stock
Broker, ...), turn each into a checklist item, track evidence, and catch the
entities that fall behind — all while staying auditable. Today that's manual,
slow, and error-prone. Amendments make it worse: someone has to notice that a
new circular supersedes an old one and manually retire the obligations it
replaces.

## What it does

1. **Ingest** — Upload a circular PDF. Docling parses it into structured text;
   Gemini (via a LangGraph extraction agent) reads it and drafts candidate
   obligations, each anchored to a verbatim citation in the source document.
2. **Guard** — Every draft is checked against the actual source text before it
   can be shown. Citations that don't verbatim-match the circular (beyond
   typographic normalization like curly quotes/ligatures) are rejected. The
   model never gets to assert a quote that isn't really there.
3. **Human review** — A compliance officer reviews each draft in the
   `CitationPanel`, sees the exact source passage, and publishes it. Nothing
   binds until a person says so — this is a hard gate, not a formality.
4. **Fan-out** — On publish, the obligation is classified against
   `IntermediaryCategory` and turned into a `ComplianceChecklistItem` for every
   matching intermediary and client, orchestrated by Trigger.dev.
5. **Gap detection** — A scheduled job (`GAP_DETECTION_CRON`) evaluates every
   checklist item's due date and evidence state and raises a `ComplianceGap`
   when something is missing, overdue, or unverified — after a 30-day grace
   period, never immediately.
6. **Remediation** — Intermediaries upload evidence directly to object storage
   (R2, via presigned URLs); once confirmed, the checklist item flips to
   COMPLIANT and its gap auto-resolves.
7. **Amendments** — Ingesting a circular with `--supersedes <documentId>`
   proposes a mapping from each new draft to the obligation it would retire.
   A human confirms the mapping and publishes; only then does the old
   obligation flip to SUPERSEDED, its open items close as NOT_APPLICABLE, and
   the replacement fans out in its place.
8. **Audit trail** — Every state-changing action (publish, fan-out, evidence
   confirmation, gap detection, supersession) writes an immutable
   `AuditLogEntry`, so the full history of who/what/when is always
   reconstructable.

## Why the design is defensible

- **Citations are verified, not trusted.** The extraction guard
  (`apps/worker/src/agents/extraction/citationMatch.ts`) rejects any
  obligation whose quote doesn't actually appear in the source chunk. This is
  the single guarantee the product can't compromise on: it never lets a
  hallucinated rule reach a human as if it were real.
- **A human publishes, the machine never does.** `obligation.publish` is
  admin-gated. Extraction produces DRAFT rows; nothing downstream (fan-out,
  notifications, gap tracking) fires until a person reviews and confirms.
- **Gaps are derived, never asserted.** `detectGaps()` is the only writer of
  `ComplianceGap` rows — the dashboard shows exactly what the engine computed
  from real checklist/evidence state, nothing is seeded or staged for demo
  purposes (see `docs/DEMO.md` for how aged state is produced honestly, via
  backdating + calling the real detector).
- **Extraction accuracy is measured, not claimed.** `docs/BENCHMARK.md` defines
  a precision/recall/F1 methodology against hand-labelled ground truth before
  any number is allowed to be quoted.

## Architecture

```
apps/web        React 19 + TanStack Start/Router/Query, Tailwind v4, shadcn —
                 the compliance officer / intermediary UI, deployed to Vercel
                 as a static SPA.

apps/worker      Hono + tRPC API, LangGraph extraction agent (Gemini
                 2.5-flash), gap detection, Trigger.dev fan-out jobs,
                 Clerk auth, R2 storage — deployed to Render as a Docker
                 service.

services/
  docling-sidecar  SUPERSEDED. The former Python/FastAPI PDF parser. Parsing is
                    now TypeScript (apps/worker/src/ingestion/); this is kept
                    on disk for output comparison and is not deployed.

packages/
  db             Prisma schema + client, shared by web and worker
                 (IntermediaryCategory, Obligation, ComplianceChecklistItem,
                 ComplianceGap, AuditLogEntry, ...).
  schemas        Shared Zod schemas / types between web and worker.
  config         Shared tsconfig base.
```

Postgres + pgvector on Neon backs everything; `packages/db` is the single
source of truth for the schema.

## Getting started

Requires Bun (`packageManager: bun@1.3.1`).

```bash
bun install

# database
cd packages/db && npx prisma migrate deploy && cd ../..
bun run db:seed        # required — see below

# worker API (separate terminal)
cd apps/worker && bun run dev     # http://localhost:8787

# web app (separate terminal)
cd apps/web && bun run dev        # http://localhost:3000
```

`bun run db:seed` is **not optional**: it creates the six
`IntermediaryCategory` rows that `classifyApplicability` depends on.
Obligations whose category isn't seeded are silently dropped at fan-out with
no visible error — see `docs/DEMO.md` for the full explanation.

Copy `apps/worker/.env.example` to `apps/worker/.env` and fill in
`DATABASE_URL`, `GEMINI_API_KEY`, Clerk keys, and R2
credentials at minimum. Optional integrations (Resend email, Trigger.dev,
`INTERNAL_API_SECRET`) degrade gracefully when unset — see the file's inline
comments for exactly what each one does when missing.

## Try it end to end

```bash
cd apps/worker
bun run ingest -- \
  --file ./circulars/ia-master-circular.pdf \
  --title "Master Circular for Investment Advisers" \
  --circular "SEBI/HO/MIRSD/MIRSD-PoD-1/P/CIR/2024/50" \
  --issued 2024-05-15 \
  --url "https://www.sebi.gov.in/..."
```

Then open `/obligations/review` in the web app, inspect the citation panel,
and publish. Full guided walkthrough — including how to demo gap detection
and the amendment/supersession flow — is in **`docs/DEMO.md`**.

## Docs

- [`docs/DEMO.md`](docs/DEMO.md) — full narrated demo runbook, beat by beat.
- [`docs/BENCHMARK.md`](docs/BENCHMARK.md) — extraction accuracy methodology
  (precision/recall/F1 against hand-labelled ground truth).
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — deploying web and worker
  (Vercel) and Postgres (Neon). No Python service to deploy.
- [`docs/pitch/`](docs/pitch) — pitch deck variants (SEBI TechSprint, IDBI
  Innovate, platform overview).

## Useful scripts

Run from the repo root unless noted.

| Command | What it does |
|---|---|
| `bun run dev` | Start all apps via turbo |
| `bun run db:seed` | Seed `IntermediaryCategory` + demo tenants (required) |
| `bun run db:studio` | Open Prisma Studio |
| `cd apps/worker && bun run ingest -- ...` | Ingest a circular PDF |
| `cd apps/worker && bun run benchmark` | Run the extraction accuracy benchmark |
| `cd apps/worker && bun run demo:seed` | Backdate state so gap detection has something to find |
| `cd apps/worker && bun run relabel-mocks` | Detect/fix mock documents mislabelled as real SEBI circulars |

## Tech stack

TypeScript everywhere · React 19 · TanStack Start/Router/Query · Tailwind v4 +
shadcn/radix · Hono · tRPC · Prisma + Postgres/pgvector (Neon) · LangGraph +
Gemini 2.5-flash · Docling (Python/FastAPI) · Clerk · Cloudflare R2 ·
Trigger.dev · Resend · Turborepo + Bun workspaces.
