# Demo runbook

The order below is the order the story makes sense in, and each beat maps to a real
procedure in the codebase — nothing here is staged UI.

## Before recording

```bash
bun install
cd packages/db && npx prisma migrate deploy && cd ../..
bun run db:seed
```

`db:seed` is load-bearing, not boilerplate. It creates all six `IntermediaryCategory` rows,
and `classifyApplicability` **silently drops** any obligation whose category is not seeded —
so a missing `STOCKBROKER` row means every stockbroker obligation vanishes with no error
anywhere. It also creates one tenant per category (Alpha Wealth Advisors / IA, Meridian
Securities / STOCKBROKER); without a stockbroker tenant, fan-out for stockbroker obligations
succeeds and creates nothing.

Start the Docling sidecar (`services/docling-sidecar`, port 8000), the worker
(`cd apps/worker && bun run dev`, port 8787) and the web app (`cd apps/web && bun run dev`,
port 3000).

## Beats

1. **The problem.** A new SEBI circular. Sixty pages of prose that a compliance team has to
   turn into work.

2. **Ingest.** Run it live and let the funnel print:

   ```bash
   cd apps/worker && bun run ingest -- --file ./circulars/ia-master-circular.pdf --title "Master Circular for Investment Advisers" --circular "SEBI/HO/MIRSD/MIRSD-PoD-1/P/CIR/2024/50" --issued 2024-05-15 --url "https://www.sebi.gov.in/..."
   ```

   Note the document id it prints — later beats need it.

3. **Trust.** Open a DRAFT obligation and show `CitationPanel` proving the quote is verbatim
   in the source paragraph. Mention what the guard *rejected*: the funnel prints how many
   candidates failed the citation check, and how many matched only after typographic
   normalisation. The guard folds ligatures and curly quotes; it never folds wording.

4. **Human gate.** Review and publish (`obligation.publish`, admin-only). Nothing binds until
   a person says so.

5. **Fan-out.** Checklist items appear across intermediaries and their clients.

6. **Gaps.** The dashboard lights up. Show the Resend notification email.

7. **Remediate.** Upload evidence (`evidence.getUploadUrl` → `confirmUpload`); the item goes
   COMPLIANT and its gap resolves.

8. **Audit.** The immutable `AuditLogEntry` trail behind every step above.

9. **Amendment.** Ingest the amending circular against the first one:

   ```bash
   cd apps/worker && bun run ingest -- --file ./circulars/ia-amendment.pdf --title "Amendment to Master Circular for Investment Advisers" --circular "SEBI/HO/MIRSD/.../2025/xx" --issued 2025-03-01 --url "https://www.sebi.gov.in/..." --supersedes <documentId-from-beat-2>
   ```

   The run ends with a reconciliation summary: how many drafts amend an existing obligation,
   how many are carried forward, how many are genuinely new. Go to `/obligations/review` —
   the amendment panel shows each proposed mapping side by side with the clause it would
   retire, and the reason for the suggestion. Confirm one, then publish it. The old
   obligation flips to SUPERSEDED, its outstanding checklist items close as NOT_APPLICABLE,
   its open gaps resolve with a reason, and the replacement fans out in its place.

   The point to say out loud: the machine proposed, a human decided, and the moment the new
   rule went live is the same moment the old one switched off.

10. **Close on numbers.** Corpora named, obligations extracted, precision/recall/F1 from
    `docs/BENCHMARK.md`, funnel yield.

## If the dashboard is empty

The gap engine is time-based: `evaluateGap` applies a 30-day grace period before flagging
`MISSING_EVIDENCE`, and fan-out always sets `dueDate` in the future. A circular ingested
today therefore produces **zero gaps**, correctly. To demo beats 6–7 you need aged state:

```bash
cd apps/worker && bun run demo:seed -- --dry-run   # show the plan, change nothing
cd apps/worker && bun run demo:seed                # apply it (no emails sent)
```

This backdates checklist items and attaches evidence, then calls the real `detectGaps()`.
It never writes a `ComplianceGap` row directly — every finding on the dashboard is derived
by the same engine that runs in production. Pass `--notify` only if you want the emails.

It is safe to re-run: each run first clears the evidence records it created previously, so
the resulting posture is identical every time rather than drifting.

Expect roughly: 3 LOW and 2 MEDIUM missing-evidence, 3 stale-evidence MEDIUM, 2 HIGH and
2 CRITICAL past-deadline, 5 compliant, 2 healthy upcoming — all four severity bands, none
of them fabricated.
