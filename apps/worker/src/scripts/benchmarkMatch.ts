// Pure scoring logic for benchmarkExtraction.ts — no database, no file I/O,
// so the definition of "did the extractor find this obligation?" is
// unit-testable and can be argued with directly.

import { normalize } from "../agents/extraction/citationMatch";

export interface Citable {
  id: string;
  citationText: string;
}

export interface Match<G extends Citable, E extends Citable> {
  groundTruth: G;
  extracted: E;
  score: number;
}

export interface MatchResult<G extends Citable, E extends Citable> {
  matched: Match<G, E>[];
  missed: G[]; // labelled but not extracted → false negatives
  spurious: E[]; // extracted but not labelled → false positives
}

// Two references to the same obligation rarely quote identical spans: the
// labeller marks the operative clause, the model may quote a sentence more or
// a sub-clause less. So matching is done on how much of the SHORTER quote is
// contained in the longer one (overlap coefficient) rather than on Jaccard,
// which would penalise a correct extraction purely for quoting more context.
//
// Both sides go through the extraction guard's own normaliser, so a label
// copied verbatim from the PDF and a quote the model tidied compare equal.
export function citationOverlap(a: string, b: string): number {
  const tokensA = tokenize(a);
  const tokensB = tokenize(b);
  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let intersection = 0;
  for (const token of tokensA) if (tokensB.has(token)) intersection += 1;

  return intersection / Math.min(tokensA.size, tokensB.size);
}

function tokenize(text: string): Set<string> {
  return new Set(
    normalize(text)
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean),
  );
}

// Deliberately high. A loose threshold inflates recall by pairing a labelled
// obligation with whatever nearby clause the model happened to emit, which is
// the single easiest way to make these numbers lie.
export const MATCH_THRESHOLD = 0.6;

// One-to-one, assigned best-score-first. Greedy rather than optimal
// (Hungarian): with ~40 labels the difference is vanishingly rare, and a
// reviewer can follow greedy assignment when auditing a specific pairing.
export function matchAgainstGroundTruth<G extends Citable, E extends Citable>(
  groundTruth: G[],
  extracted: E[],
  threshold: number = MATCH_THRESHOLD,
): MatchResult<G, E> {
  const scored: Array<{ groundTruth: G; extracted: E; score: number }> = [];
  for (const gt of groundTruth) {
    for (const ex of extracted) {
      const score = citationOverlap(gt.citationText, ex.citationText);
      if (score >= threshold) scored.push({ groundTruth: gt, extracted: ex, score });
    }
  }
  scored.sort((x, y) => y.score - x.score);

  const usedGroundTruth = new Set<string>();
  const usedExtracted = new Set<string>();
  const matched: Match<G, E>[] = [];

  for (const pair of scored) {
    if (usedGroundTruth.has(pair.groundTruth.id) || usedExtracted.has(pair.extracted.id)) continue;
    usedGroundTruth.add(pair.groundTruth.id);
    usedExtracted.add(pair.extracted.id);
    matched.push(pair);
  }

  return {
    matched,
    missed: groundTruth.filter((g) => !usedGroundTruth.has(g.id)),
    spurious: extracted.filter((e) => !usedExtracted.has(e.id)),
  };
}

export interface Metrics {
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  precision: number;
  recall: number;
  f1: number;
}

export function computeMetrics(
  truePositives: number,
  falsePositives: number,
  falseNegatives: number,
): Metrics {
  // A zero denominator means the question is undefined, not that the answer is
  // zero — extracting nothing from nothing is not 0% precise. Reported as 0
  // and always shown next to the raw counts so an empty run can't be mistaken
  // for a bad one.
  const precision =
    truePositives + falsePositives === 0 ? 0 : truePositives / (truePositives + falsePositives);
  const recall =
    truePositives + falseNegatives === 0 ? 0 : truePositives / (truePositives + falseNegatives);
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);

  return { truePositives, falsePositives, falseNegatives, precision, recall, f1 };
}
