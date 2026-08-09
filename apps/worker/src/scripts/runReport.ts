// A durable record of one ingestion run, written by scripts/ingestCircular.ts
// and read by scripts/benchmarkExtraction.ts.
//
// It exists because the two narrowing stages of the pipeline destroy evidence:
// a candidate dropped by the citation guard or by classification is never
// persisted, so after the run the database cannot distinguish "the model never
// found this obligation" from "the model found it and we threw it away". The
// benchmark's miss-attribution needs that distinction, and re-running a 60-page
// circular through Gemini just to recover it is neither cheap nor deterministic.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ExtractionSummary } from "../agents/extraction/graph";

export interface IngestRunReport {
  documentId: string;
  title: string;
  circularNumber: string;
  file: string;
  ingestedAt: string;
  elapsedSec: number;
  persisted: number;
  summary: ExtractionSummary;
}

// Kept out of the repo (see apps/worker/.gitignore): these are run artefacts
// tied to one database's document ids, not source.
const RUNS_DIR = path.resolve(import.meta.dirname, "../../.runs");

function reportPath(documentId: string): string {
  return path.join(RUNS_DIR, `${documentId}.json`);
}

export async function writeRunReport(
  documentId: string,
  report: IngestRunReport,
): Promise<string> {
  await mkdir(RUNS_DIR, { recursive: true });
  const target = reportPath(documentId);
  await writeFile(target, JSON.stringify(report, null, 2), "utf8");
  return target;
}

// Returns null rather than throwing when no report exists — the benchmark is
// still useful without one (it just cannot attribute misses to a stage), and
// documents ingested before this file existed have none.
export async function readRunReport(documentId: string): Promise<IngestRunReport | null> {
  try {
    return JSON.parse(await readFile(reportPath(documentId), "utf8")) as IngestRunReport;
  } catch {
    return null;
  }
}
