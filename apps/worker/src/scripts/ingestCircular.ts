// Ingests one SEBI circular end-to-end through the real pipeline and reports
// the extraction funnel.
//
// This is the script that answers PS2's "demonstrate performance on at least
// one concrete regulatory scenario" — it names the corpus, runs it, and
// prints numbers you can quote. It deliberately drives the SAME code path the
// app uses (runIngestionWorkflow), so what it measures is what the product
// actually does; nothing here reimplements ingestion.
//
// Usage:
//   bun run ingest -- --file ./circulars/ia-master-circular.pdf \
//     --title "Master Circular for Investment Advisers" \
//     --circular "SEBI/HO/MIRSD/MIRSD-PoD/P/CIR/2024/XX" \
//     --issued 2024-05-15 \
//     --url "https://www.sebi.gov.in/..."
//
// Requires: DATABASE_URL, GEMINI_API_KEY and the R2_* vars. Parsing runs
// in-process (unpdf for the text layer, Gemini for scanned pages), so there is
// no separate service to start.

import dotenv from "dotenv";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { basename } from "node:path";

dotenv.config({ path: path.resolve(import.meta.dirname, "../../../../packages/db/.env") });
dotenv.config({ path: path.resolve(import.meta.dirname, "../../.env") });

import { prisma } from "@sebi/db";
import { uploadObject } from "../storage/r2";
import { runIngestionWorkflow } from "../ingestion/workflow";
import { reconcileSupersession } from "../services/reconcileSupersession";
import { writeRunReport } from "./runReport";

interface Args {
  file: string;
  title: string;
  circular: string;
  issued: string;
  url: string;
  // Optional: the RegulatoryDocument id this circular amends. Turns the run
  // into an amendment — after extraction, every DRAFT is matched against the
  // prior circular's PUBLISHED obligations and a supersession mapping is
  // proposed for human review.
  supersedes?: string;
}

function parseArgs(): Args {
  const raw = process.argv.slice(2);
  const map = new Map<string, string>();
  for (let i = 0; i < raw.length; i++) {
    const key = raw[i];
    if (key?.startsWith("--")) {
      const value = raw[i + 1];
      if (value && !value.startsWith("--")) {
        map.set(key.slice(2), value);
        i++;
      }
    }
  }

  const missing = ["file", "title", "circular", "issued", "url"].filter((k) => !map.get(k));
  if (missing.length > 0) {
    console.error(`Missing required flag(s): ${missing.map((m) => `--${m}`).join(", ")}\n`);
    console.error(
      [
        "Usage:",
        "  bun run ingest -- \\",
        "    --file ./circulars/ia-master-circular.pdf \\",
        '    --title "Master Circular for Investment Advisers" \\',
        '    --circular "SEBI/HO/MIRSD/.../2024/XX" \\',
        "    --issued 2024-05-15 \\",
        '    --url "https://www.sebi.gov.in/..." \\',
        "    [--supersedes <documentId>]   # if this circular amends an earlier one",
      ].join("\n"),
    );
    process.exit(1);
  }

  return Object.fromEntries(map) as unknown as Args;
}

function requireEnv(): void {
  const required = ["DATABASE_URL", "GEMINI_API_KEY", "R2_BUCKET_NAME", "R2_ENDPOINT"];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error(`Missing env var(s): ${missing.join(", ")}`);
    process.exit(1);
  }
}

function pct(part: number, whole: number): string {
  if (whole === 0) return "—";
  return `${Math.round((part / whole) * 100)}%`;
}

async function main() {
  const args = parseArgs();
  requireEnv();

  const issuedDate = new Date(args.issued);
  if (Number.isNaN(issuedDate.getTime())) {
    console.error(`--issued is not a valid date: "${args.issued}" (expected YYYY-MM-DD)`);
    process.exit(1);
  }

  const pdf = await readFile(args.file);
  const fileName = basename(args.file);
  console.log(`\nIngesting ${fileName} (${(pdf.byteLength / 1024 / 1024).toFixed(2)} MB)`);

  // The categories the extraction agent can classify against. If this is
  // empty or missing the code the model emits, classifyApplicability drops
  // the obligation silently — so surface it up front rather than at the end.
  const categories = await prisma.intermediaryCategory.findMany({ orderBy: { code: "asc" } });
  if (categories.length === 0) {
    console.error(
      "No IntermediaryCategory rows exist. Run `bun run db:seed` first — without them " +
        "every extracted obligation is discarded at the classification step.",
    );
    process.exit(1);
  }
  console.log(`Categories available: ${categories.map((c) => c.code).join(", ")}`);

  if (args.supersedes) {
    const prior = await prisma.regulatoryDocument.findUnique({
      where: { id: args.supersedes },
      select: { id: true, title: true, circularNumber: true },
    });
    if (!prior) {
      console.error(`--supersedes: no RegulatoryDocument with id "${args.supersedes}"`);
      process.exit(1);
    }
    console.log(`Amends: ${prior.title} (${prior.circularNumber})`);
  }

  const document = await prisma.regulatoryDocument.create({
    data: {
      title: args.title,
      circularNumber: args.circular,
      issuedDate,
      sourceUrl: args.url,
      r2ObjectKey: "",
      status: "UPLOADED",
      supersedesId: args.supersedes,
    },
  });

  const r2ObjectKey = `documents/${document.id}/${fileName}`;
  await uploadObject(r2ObjectKey, pdf, "application/pdf");
  await prisma.regulatoryDocument.update({
    where: { id: document.id },
    data: { r2ObjectKey },
  });
  console.log(`Uploaded to R2: ${r2ObjectKey}`);
  console.log(`Document id: ${document.id}\n`);

  console.log("Running pipeline (parse → chunk → embed → extract → validate → classify → persist)…");
  const startedAt = Date.now();
  const summary = await runIngestionWorkflow(document.id);
  const elapsedSec = ((Date.now() - startedAt) / 1000).toFixed(1);

  const persisted = await prisma.obligation.count({ where: { documentId: document.id } });
  const byCategory = await prisma.intermediaryCategory.findMany({
    select: {
      code: true,
      _count: { select: { obligations: { where: { documentId: document.id } } } },
    },
    orderBy: { code: "asc" },
  });

  console.log(`\n─── Extraction funnel ─── (${elapsedSec}s)`);
  console.log(`  chunks embedded            ${summary.chunks}`);
  console.log(`  candidates from model      ${summary.candidates}`);
  console.log(
    `  survived citation check    ${summary.citationValid}  ` +
      `(dropped ${summary.droppedByCitation}, ${pct(summary.droppedByCitation, summary.candidates)})`,
  );
  console.log(
    `    ├─ exact quote           ${summary.citationExact}  ` +
      `(${pct(summary.citationExact, summary.citationValid)} of validated)`,
  );
  console.log(
    `    └─ matched after         ${summary.citationNormalized}  ` +
      `(${pct(summary.citationNormalized, summary.citationValid)} of validated)\n` +
      `       typographic folding`,
  );
  console.log(
    `  survived classification    ${summary.applicabilityResolved}  ` +
      `(dropped ${summary.droppedByApplicability}, ${pct(summary.droppedByApplicability, summary.citationValid)})`,
  );
  console.log(`  persisted as DRAFT         ${persisted}`);
  console.log(`  end-to-end yield           ${pct(persisted, summary.candidates)} of candidates`);

  console.log(`\n─── Obligations by intermediary category ───`);
  for (const c of byCategory) {
    if (c._count.obligations > 0) console.log(`  ${c.code.padEnd(12)} ${c._count.obligations}`);
  }

  if (summary.droppedByCitation > 0) {
    console.log(
      `\n⚠ ${summary.droppedByCitation} candidate(s) failed the verbatim citation check.\n` +
        `  The guard folds typography (ligatures, curly quotes, soft/line-break hyphens) but\n` +
        `  never wording, so these are quotes that genuinely do not appear in the cited chunk —\n` +
        `  i.e. the model paraphrased or hallucinated. Inspect them in the run report below.`,
    );
  }
  if (summary.citationNormalized > 0) {
    console.log(
      `\nℹ ${summary.citationNormalized} citation(s) matched only after typographic normalisation.\n` +
        `  Expected for real SEBI PDFs. If this share is very high, check citationMatch.ts is not\n` +
        `  folding more than it should — the trust claim rests on that guard staying strict.`,
    );
  }
  if (summary.droppedByApplicability > 0) {
    console.log(
      `\n⚠ ${summary.droppedByApplicability} candidate(s) were discarded for having no known ` +
        `intermediary category.\n  Check the errors below for the codes the model invented, then either add them to\n` +
        `  the seed or tighten the closed list in extractionPrompt.ts.`,
    );
  }
  if (summary.errors.length > 0) {
    console.log(`\n─── Errors (${summary.errors.length}) ───`);
    for (const e of summary.errors.slice(0, 25)) console.log(`  • ${e}`);
    if (summary.errors.length > 25) console.log(`  … and ${summary.errors.length - 25} more`);
  }

  const reconciliation = await reconcileSupersession(document.id);
  if (reconciliation) {
    console.log(`\n─── Amendment reconciliation ───`);
    console.log(`  proposals for review       ${reconciliation.proposed}`);
    console.log(`    amends an existing       ${reconciliation.amends}`);
    console.log(`    carried forward          ${reconciliation.unchanged}`);
    console.log(`    genuinely new            ${reconciliation.new}`);
    console.log(
      `\n  Nothing has been superseded yet. Confirm the mapping at /obligations/review,\n` +
        `  then publish — the prior obligation is retired at that moment, not before.`,
    );
  }

  const reportPath = await writeRunReport(document.id, {
    documentId: document.id,
    title: args.title,
    circularNumber: args.circular,
    file: fileName,
    ingestedAt: new Date().toISOString(),
    elapsedSec: Number(elapsedSec),
    persisted,
    summary,
  });
  console.log(`\nRun report written to ${reportPath}`);
  console.log(`  (benchmarkExtraction reads this to attribute misses to the stage that dropped them)`);

  console.log(`\nNext: review the DRAFT obligations at /obligations/review, then publish to fan out.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error("\nIngestion failed:", error);
    await prisma.$disconnect();
    process.exit(1);
  });
