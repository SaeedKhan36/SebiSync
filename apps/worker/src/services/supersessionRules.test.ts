import { describe, expect, it } from "vitest";
import {
  proposeSupersessions,
  similarity,
  TEXT_MATCH_THRESHOLD,
  UNCHANGED_THRESHOLD,
  type MatchableObligation,
} from "./supersessionRules";

function obligation(overrides: Partial<MatchableObligation> & { id: string }): MatchableObligation {
  return {
    code: "IA-GENERIC-01",
    title: "Generic obligation",
    obligatedAction: "Do the thing",
    citationText: "The adviser shall do the thing.",
    ...overrides,
  };
}

const RISK_PROFILING = {
  code: "IA-RISK-PROFILING-01",
  title: "Risk profiling of clients",
  obligatedAction: "Conduct and document a risk profile for every client before advising",
  citationText:
    "The investment adviser shall conduct a risk profiling of the client before providing investment advice.",
};

describe("similarity", () => {
  it("is 1 for identical text", () => {
    expect(similarity(RISK_PROFILING.citationText, RISK_PROFILING.citationText)).toBe(1);
  });

  it("is 0 for text with no shared content words", () => {
    expect(similarity("risk profiling of clients", "quarterly settlement of funds")).toBe(0);
  });

  it("ignores boilerplate stopwords so unrelated clauses do not look similar", () => {
    // Both are pure boilerplate apart from the noun — overlap must not be
    // inflated by "the", "shall", "of", "a".
    expect(similarity("The intermediary shall maintain a register of complaints", "The intermediary shall maintain a register of margins")).toBeLessThan(
      UNCHANGED_THRESHOLD,
    );
  });

  it("is symmetric", () => {
    const a = "risk profiling shall be documented annually";
    const b = "annual documentation of client risk profiling";
    expect(similarity(a, b)).toBe(similarity(b, a));
  });

  it("is 0 when either side has no content words", () => {
    expect(similarity("the of and", "risk profiling")).toBe(0);
  });
});

describe("proposeSupersessions", () => {
  it("proposes AMENDS on a code match with changed substance", () => {
    const prior = obligation({ id: "p1", ...RISK_PROFILING });
    const draft = obligation({
      id: "n1",
      ...RISK_PROFILING,
      obligatedAction: "Conduct and document a risk profile for every client and review it annually",
      citationText:
        "The investment adviser shall conduct a risk profiling of the client before providing investment advice and shall review it every twelve months.",
    });

    const [proposal] = proposeSupersessions([draft], [prior]);
    expect(proposal).toMatchObject({
      newObligationId: "n1",
      priorObligationId: "p1",
      kind: "AMENDS",
      matchScore: 1,
    });
    expect(proposal!.rationale).toContain("IA-RISK-PROFILING-01");
  });

  it("proposes UNCHANGED when a code-matched clause is carried forward verbatim", () => {
    const prior = obligation({ id: "p1", ...RISK_PROFILING });
    const draft = obligation({ id: "n1", ...RISK_PROFILING });

    expect(proposeSupersessions([draft], [prior])[0]).toMatchObject({
      priorObligationId: "p1",
      kind: "UNCHANGED",
    });
  });

  it("proposes NEW when nothing matches by code or text", () => {
    const prior = obligation({ id: "p1", ...RISK_PROFILING });
    const draft = obligation({
      id: "n1",
      code: "IA-SCORES-01",
      title: "Resolution of SCORES complaints",
      obligatedAction: "Resolve complaints received via SCORES within twenty-one calendar days",
      citationText:
        "Every complaint received through the SCORES portal shall be resolved within twenty-one calendar days of receipt.",
    });

    expect(proposeSupersessions([draft], [prior])[0]).toMatchObject({
      newObligationId: "n1",
      priorObligationId: null,
      kind: "NEW",
      matchScore: null,
    });
  });

  it("falls back to text similarity when the code was renumbered", () => {
    const prior = obligation({ id: "p1", ...RISK_PROFILING });
    const draft = obligation({
      id: "n1",
      code: "IA-CLIENT-RISK-07", // renumbered in the amending circular
      title: RISK_PROFILING.title,
      obligatedAction: RISK_PROFILING.obligatedAction,
      citationText: RISK_PROFILING.citationText,
    });

    const [proposal] = proposeSupersessions([draft], [prior]);
    expect(proposal!.priorObligationId).toBe("p1");
    expect(proposal!.matchScore).toBeGreaterThanOrEqual(TEXT_MATCH_THRESHOLD);
    expect(proposal!.rationale).toContain("No code match");
  });

  it("lets a code match outrank a textually similar rival", () => {
    const decoy = obligation({ id: "p-decoy", ...RISK_PROFILING, code: "IA-OTHER-99" });
    const real = obligation({ id: "p-real", ...RISK_PROFILING });
    const draft = obligation({ id: "n1", ...RISK_PROFILING });

    const [proposal] = proposeSupersessions([draft], [decoy, real]);
    expect(proposal!.priorObligationId).toBe("p-real");
    expect(proposal!.matchScore).toBe(1);
  });

  it("never proposes the same prior obligation for two drafts", () => {
    const prior = obligation({ id: "p1", ...RISK_PROFILING });
    const draftA = obligation({ id: "n1", ...RISK_PROFILING, code: "IA-A-01" });
    const draftB = obligation({ id: "n2", ...RISK_PROFILING, code: "IA-B-01" });

    const proposals = proposeSupersessions([draftA, draftB], [prior]);
    const claimed = proposals.map((p) => p.priorObligationId).filter(Boolean);
    expect(claimed).toEqual(["p1"]);
    expect(proposals.filter((p) => p.kind === "NEW")).toHaveLength(1);
  });

  it("returns one proposal per draft, in draft order", () => {
    const drafts = [
      obligation({ id: "n1", code: "IA-A-01" }),
      obligation({ id: "n2", code: "IA-B-01" }),
      obligation({ id: "n3", code: "IA-C-01" }),
    ];
    expect(proposeSupersessions(drafts, []).map((p) => p.newObligationId)).toEqual([
      "n1",
      "n2",
      "n3",
    ]);
  });

  it("proposes everything as NEW when there is no prior circular", () => {
    const drafts = [obligation({ id: "n1" }), obligation({ id: "n2", code: "IA-X-01" })];
    const proposals = proposeSupersessions(drafts, []);
    expect(proposals).toHaveLength(2);
    expect(proposals.every((p) => p.kind === "NEW" && p.priorObligationId === null)).toBe(true);
  });

  it("returns nothing when the amending circular extracted nothing", () => {
    expect(proposeSupersessions([], [obligation({ id: "p1" })])).toEqual([]);
  });
});
