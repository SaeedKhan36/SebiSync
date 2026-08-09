// Scores the extraction pipeline against a hand-labelled ground truth and
// reports precision, recall and F1 — the numbers behind PS2's "demonstrably
// improves accuracy".
//
// It reads what the pipeline actually persisted (not a re-run), so the figures
// describe the same obligations a reviewer would see in the app. Where a
// labelled obligation is missing, the run report written by ingestCircular is
// used to say WHICH stage lost it: the model never proposed it, the citation
// guard rejected it, or classification dropped it for want of a seeded
// category. "Recall is 72%" is a grade; "recall is 72% and eleven of the
// misses were dropped by an unseeded category" is a bug report.
//
// Usage:
//   bun run benchmark -- --ground-truth src/scripts/groundTruth/ia.json \
//     --document <regulatoryDocumentId>

import dotenv from "dotenv";
import path from "node:path";
import { readFile } from "node:fs/promises";

dotenv.config({ path: path.resolve(import.meta.dirname, "../../../../packages/db/.env") });
dotenv.config({ path: path.resolve(import.meta.dirname, "../../.env") });

import { prisma } from "@sebi/db";
import { matchCitation } from "../agents/extraction/citationMatch";
import { groundTruthFileSchema, type GroundTruthEntry } from "./groundTruth/schema";
import { citationOverlap, computeMetrics, matchAgainstGroundTruth, MATCH_THRESHOLD } from "./benchmarkMatch";
import { readRunReport } from "./runReport";

interface Args {
  "ground-truth": string;
  document: string;
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

  const missing = ["ground-truth", "document"].filter((k) => !map.get(k));
  if (missing.length > 0) {
    console.error(`Missing required flag(s): ${missing.map((m) => `--${m}`).join(", ")}\n`);
    console.error(
      [
        "Usage:",
        "  bun run benchmark -- \\",
        "    --ground-truth src/scripts/groundTruth/ia.json \\",
        "    --document <regulatoryDocumentId>",
        "",
        "The document id is printed by `bun run ingest`.",
      ].join("\n"),
    );
    process.exit(1);
  }

  return Object.fromEntries(map) as unknown as Args;
}

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

// Why a labelled obligation never made it into the database. Ordered from
// "the pipeline threw it away" to "the model never saw it" — each points at a
// different fix.
type MissCause =
  | "DROPPED_BY_CITATION_GUARD"
  | "DROPPED_BY_CLASSIFICATION"
  | "FAILED_TO_PERSIST"
  | "NOT_EXTRACTED"
  | "NOT_IN_PARSED_TEXT";

const MISS_CAUSE_LABEL: Record<MissCause, string> = {
  DROPPED_BY_CITATION_GUARD: "dropped by citation guard (model paraphrased the quote)",
  DROPPED_BY_CLASSIFICATION: "dropped by classification (no seeded intermediary category)",
  FAILED_TO_PERSIST: "failed to persist (database error)",
  NOT_EXTRACTED: "never extracted (text was present; model did not propose it)",
  NOT_IN_PARSED_TEXT: "not in parsed text (lost at PDF parse/chunk stage)",
};

async function main() {
  const args = parseArgs();

  const raw = JSON.parse(await readFile(args["ground-truth"], "utf8")) as unknown;
  const parsed = groundTruthFileSchema.safeParse(raw);
  if (!parsed.success) {
    console.error(`Ground-truth file is malformed:\n${parsed.error.message}`);
    process.exit(1);
  }
  const groundTruth = parsed.data;

  if (groundTruth.entries.length === 0) {
    console.error(
      `Ground-truth file "${args["ground-truth"]}" has no entries — there is nothing to score against.\n` +
        `Label a chapter first; see src/scripts/groundTruth/README.md for the procedure.`,
    );
    process.exit(1);
  }

  const document = await prisma.regulatoryDocument.findUnique({
    where: { id: args.document },
    select: { id: true, title: true, circularNumber: true, status: true },
  });
  if (!document) {
    console.error(`No RegulatoryDocument with id "${args.document}"`);
    process.exit(1);
  }

  const allObligations = await prisma.obligation.findMany({
    where: { documentId: document.id },
    select: { id: true, code: true, title: true, citationText: true, citationPage: true },
  });

  // Precision is only meaningful inside an exhaustively-labelled span: an
  // obligation correctly extracted from an unlabelled chapter has no label to
  // match and would otherwise be punished as a false positive. Recall is
  // unaffected either way.
  const scope = groundTruth.scopePages;
  const inScope = scope
    ? allObligations.filter(
        (o) => o.citationPage != null && o.citationPage >= scope.fromPage && o.citationPage <= scope.toPage,
      )
    : allObligations;
  const outOfScope = allObligations.length - inScope.length;

  const result = matchAgainstGroundTruth(
    groundTruth.entries.map((e) => ({ ...e, id: e.id })),
    inScope,
  );
  const metrics = computeMetrics(
    result.matched.length,
    result.spurious.length,
    result.missed.length,
  );

  console.log(`\n═══ Extraction benchmark ═══`);
  console.log(`  corpus                  ${groundTruth.corpus}`);
  console.log(`  document                ${document.title}`);
  console.log(`  circular                ${document.circularNumber}`);
  console.log(`  labelled scope          ${groundTruth.scope}`);
  console.log(
    `  scope pages             ${scope ? `${scope.fromPage}–${scope.toPage}` : "whole document"}`,
  );
  console.log(`  labelled by             ${groundTruth.labelledBy} on ${groundTruth.labelledAt}`);
  console.log(`  match rule              citation overlap ≥ ${MATCH_THRESHOLD}, one-to-one`);

  console.log(`\n─── Counts ───`);
  console.log(`  ground-truth obligations   ${groundTruth.entries.length}`);
  console.log(`  extracted, in scope        ${inScope.length}`);
  if (outOfScope > 0) {
    console.log(`  extracted, outside scope   ${outOfScope}  (excluded — no labels there)`);
  }
  console.log(`  true positives             ${metrics.truePositives}`);
  console.log(`  false positives            ${metrics.falsePositives}`);
  console.log(`  false negatives            ${metrics.falseNegatives}`);

  console.log(`\n─── Accuracy ───`);
  console.log(`  precision               ${pct(metrics.precision)}`);
  console.log(`  recall                  ${pct(metrics.recall)}`);
  console.log(`  F1                      ${pct(metrics.f1)}`);

  if (result.missed.length > 0) {
    const causes = await attributeMisses(document.id, result.missed);
    const byCause = new Map<MissCause, GroundTruthEntry[]>();
    for (const [entry, cause] of causes) {
      byCause.set(cause, [...(byCause.get(cause) ?? []), entry]);
    }

    console.log(`\n─── Why the ${result.missed.length} miss(es) were missed ───`);
    for (const [cause, entries] of [...byCause].sort((a, b) => b[1].length - a[1].length)) {
      console.log(`  ${String(entries.length).padStart(3)}  ${MISS_CAUSE_LABEL[cause]}`);
      for (const entry of entries) {
        console.log(`         • ${entry.id} §${entry.section} — ${entry.title}`);
      }
    }
  }

  if (result.spurious.length > 0) {
    console.log(`\n─── Extracted but not labelled (${result.spurious.length}) ───`);
    console.log(
      `  Each is either a genuine false positive or an obligation the labeller missed.\n` +
        `  Worth reading before quoting the precision figure.`,
    );
    for (const ob of result.spurious.slice(0, 20)) {
      console.log(`  • ${ob.code} — ${ob.title}`);
    }
    if (result.spurious.length > 20) console.log(`  … and ${result.spurious.length - 20} more`);
  }

  console.log();
}

// Attribution order matters: a candidate the pipeline explicitly discarded is
// explained by that discard, so the run report is consulted before falling
// back to inspecting the parsed text.
async function attributeMisses(
  documentId: string,
  missed: GroundTruthEntry[],
): Promise<Array<[GroundTruthEntry, MissCause]>> {
  const report = await readRunReport(documentId);
  const dropped = report?.summary.droppedCandidates ?? [];

  if (!report) {
    console.log(
      `\nℹ No run report found for this document (apps/worker/.runs/${documentId}.json).\n` +
        `  Misses can still be split by whether the clause survived PDF parsing, but not\n` +
        `  attributed to the citation guard or classification. Re-ingest to capture one.`,
    );
  }

  const chunks = await prisma.documentChunk.findMany({
    where: { documentId },
    select: { text: true },
  });
  const chunkTexts = chunks.map((c) => c.text);

  return Promise.all(
    missed.map(async (entry): Promise<[GroundTruthEntry, MissCause]> => {
      const discarded = dropped.find(
        (d) => citationOverlap(entry.citationText, d.citationText) >= MATCH_THRESHOLD,
      );
      if (discarded) {
        const cause: MissCause =
          discarded.stage === "CITATION"
            ? "DROPPED_BY_CITATION_GUARD"
            : discarded.stage === "APPLICABILITY"
              ? "DROPPED_BY_CLASSIFICATION"
              : "FAILED_TO_PERSIST";
        return [entry, cause];
      }

      // Reuses the extraction guard's own matcher, so "is this clause in the
      // parsed text?" is answered exactly as the pipeline would answer it.
      const present = matchCitation(entry.citationText, chunkTexts) != null;
      return [entry, present ? "NOT_EXTRACTED" : "NOT_IN_PARSED_TEXT"];
    }),
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error("\nBenchmark failed:", error);
    await prisma.$disconnect();
    process.exit(1);
  });
