import { describe, expect, it } from "vitest";
import {
  citationOverlap,
  computeMetrics,
  matchAgainstGroundTruth,
  MATCH_THRESHOLD,
} from "./benchmarkMatch";

const CLAUSE =
  "The investment adviser shall conduct a risk profiling of the client before providing investment advice.";

describe("citationOverlap", () => {
  it("is 1 for identical quotes", () => {
    expect(citationOverlap(CLAUSE, CLAUSE)).toBe(1);
  });

  it("is 1 when one quote fully contains the other", () => {
    // The labeller marked the operative clause; the model quoted the whole
    // sentence. Same obligation, and the score must say so.
    expect(citationOverlap("shall conduct a risk profiling of the client", CLAUSE)).toBe(1);
  });

  it("ignores typographic differences via the extraction guard's normaliser", () => {
    const labelled = "the client’s risk profile shall be reviewed";
    const extracted = "the client's risk profile shall be reviewed";
    expect(citationOverlap(labelled, extracted)).toBe(1);
  });

  it("is 0 for unrelated clauses", () => {
    expect(
      citationOverlap(CLAUSE, "Settlement of client funds shall be completed within one working day."),
    ).toBeLessThan(MATCH_THRESHOLD);
  });

  it("is 0 when either side has no tokens", () => {
    expect(citationOverlap("", CLAUSE)).toBe(0);
  });

  it("is symmetric", () => {
    const a = "risk profiling of the client before advice";
    const b = "the adviser shall complete risk profiling of the client";
    expect(citationOverlap(a, b)).toBe(citationOverlap(b, a));
  });
});

describe("matchAgainstGroundTruth", () => {
  const gt = [
    { id: "gt-1", citationText: CLAUSE },
    { id: "gt-2", citationText: "Every complaint shall be resolved within twenty-one calendar days." },
  ];

  it("pairs a labelled obligation with its extraction", () => {
    const extracted = [{ id: "ob-1", citationText: CLAUSE }];
    const result = matchAgainstGroundTruth(gt, extracted);

    expect(result.matched).toHaveLength(1);
    expect(result.matched[0]!.groundTruth.id).toBe("gt-1");
    expect(result.matched[0]!.extracted.id).toBe("ob-1");
    expect(result.missed.map((m) => m.id)).toEqual(["gt-2"]);
    expect(result.spurious).toEqual([]);
  });

  it("reports an unlabelled extraction as spurious", () => {
    const extracted = [
      { id: "ob-1", citationText: CLAUSE },
      { id: "ob-2", citationText: "Margin shall be collected upfront from every client." },
    ];
    const result = matchAgainstGroundTruth(gt, extracted);
    expect(result.spurious.map((s) => s.id)).toEqual(["ob-2"]);
  });

  it("never pairs one extraction with two labels", () => {
    // Two labelled sub-duties, one over-broad extraction quoting both. Only
    // one can be credited; the other is a genuine miss.
    const twoDuties = [
      { id: "gt-a", citationText: "The adviser shall record the rationale for every recommendation." },
      { id: "gt-b", citationText: "The adviser shall retain such records for five years." },
    ];
    const extracted = [
      {
        id: "ob-1",
        citationText:
          "The adviser shall record the rationale for every recommendation and shall retain such records for five years.",
      },
    ];
    const result = matchAgainstGroundTruth(twoDuties, extracted);
    expect(result.matched).toHaveLength(1);
    expect(result.missed).toHaveLength(1);
  });

  it("assigns the best-scoring pair first, regardless of input order", () => {
    // ob-weak overlaps enough to clear the threshold but is a different
    // requirement; ob-strong is the real match. Listed weak-first so a
    // first-come assignment would pick the wrong one.
    const extracted = [
      { id: "ob-weak", citationText: "The adviser shall conduct a risk review of the client account." },
      { id: "ob-strong", citationText: CLAUSE },
    ];
    const result = matchAgainstGroundTruth([{ id: "gt-1", citationText: CLAUSE }], extracted);
    expect(result.matched).toHaveLength(1);
    expect(result.matched[0]!.extracted.id).toBe("ob-strong");
    expect(result.spurious.map((s) => s.id)).toEqual(["ob-weak"]);
  });

  it("counts everything as missed when nothing was extracted", () => {
    const result = matchAgainstGroundTruth(gt, []);
    expect(result.matched).toEqual([]);
    expect(result.missed).toHaveLength(2);
  });
});

describe("computeMetrics", () => {
  it("computes precision, recall and F1", () => {
    const m = computeMetrics(8, 2, 4);
    expect(m.precision).toBeCloseTo(0.8);
    expect(m.recall).toBeCloseTo(0.667, 3);
    expect(m.f1).toBeCloseTo(0.727, 3);
  });

  it("is all 1 for a perfect run", () => {
    expect(computeMetrics(10, 0, 0)).toMatchObject({ precision: 1, recall: 1, f1: 1 });
  });

  it("reports zero rather than NaN when nothing was extracted or labelled", () => {
    expect(computeMetrics(0, 0, 0)).toMatchObject({ precision: 0, recall: 0, f1: 0 });
  });

  it("reports zero precision when every extraction was spurious", () => {
    expect(computeMetrics(0, 5, 0)).toMatchObject({ precision: 0, f1: 0 });
  });
});
