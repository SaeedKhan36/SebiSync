// Pure matching logic for amendment detection: given the DRAFT obligations
// extracted from an amending circular and the PUBLISHED obligations of the
// circular it supersedes, propose which draft replaces which.
//
// No database, no I/O — same pattern as gapRules.ts, so the interesting
// decisions are unit-testable without a corpus.
//
// The output is a PROPOSAL, never an action. Nothing here retires a live
// obligation; reconcileSupersession persists these as SupersessionProposal
// rows for a human to confirm. That asymmetry is deliberate: a false NEW costs
// a duplicate checklist item, while a false AMENDS silently switches off a
// compliance requirement that is still in force.

export type SupersessionKind = "NEW" | "AMENDS" | "UNCHANGED";

export interface MatchableObligation {
  id: string;
  code: string;
  title: string;
  citationText: string;
  obligatedAction: string;
}

export interface SupersessionProposal {
  newObligationId: string;
  priorObligationId: string | null;
  kind: SupersessionKind;
  matchScore: number | null;
  rationale: string;
}

// A code match is authoritative: obligation codes are mnemonic and stable
// across a master circular and its amendment ("IA-RISK-PROFILING-01" means the
// same requirement in both), so an exact code hit outranks any text score.
const CODE_MATCH_SCORE = 1;

// Below this, a text similarity is treated as coincidence (shared boilerplate
// like "the intermediary shall" inflates overlap on unrelated clauses) and the
// draft is proposed as NEW. Tuned by hand, not fitted — it only decides which
// suggestion a human is shown first.
export const TEXT_MATCH_THRESHOLD = 0.45;

// Above this, the two clauses are near enough to identical that the amendment
// almost certainly carried the requirement forward unchanged.
export const UNCHANGED_THRESHOLD = 0.95;

const STOPWORDS = new Set([
  "the", "a", "an", "of", "to", "in", "for", "and", "or", "by", "on", "as", "at",
  "is", "are", "be", "shall", "must", "with", "any", "such", "that", "this",
  "from", "it", "its", "all", "may", "not", "under", "which", "each",
]);

function tokenize(text: string): Set<string> {
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
  return new Set(tokens);
}

// Jaccard overlap on content words. Chosen over edit distance because
// regulatory amendments reorder and re-clause far more often than they
// re-spell, and over embeddings because this must stay deterministic and
// explainable — a reviewer is shown the score and has to be able to trust it.
export function similarity(a: string, b: string): number {
  const setA = tokenize(a);
  const setB = tokenize(b);
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  for (const token of setA) if (setB.has(token)) intersection += 1;

  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

// Compares an obligation's substance, not its metadata: the title says what it
// is about, the obligated action and citation say what it actually requires.
function obligationText(o: MatchableObligation): string {
  return `${o.title} ${o.obligatedAction} ${o.citationText}`;
}

export function proposeSupersessions(
  newObligations: MatchableObligation[],
  priorObligations: MatchableObligation[],
): SupersessionProposal[] {
  const priorByCode = new Map<string, MatchableObligation>();
  for (const prior of priorObligations) {
    // Codes are unique per document, so the first (and only) hit wins.
    if (!priorByCode.has(prior.code)) priorByCode.set(prior.code, prior);
  }

  // A prior obligation can be replaced at most once (the schema's 1:1
  // supersedes relation enforces this too). Claimed greedily in descending
  // score order so the strongest match wins the contested prior, rather than
  // whichever draft happened to be extracted first.
  const claimed = new Set<string>();
  const proposals: SupersessionProposal[] = [];

  const codeMatched = new Set<string>();
  for (const draft of newObligations) {
    const prior = priorByCode.get(draft.code);
    if (!prior) continue;
    codeMatched.add(draft.id);
    claimed.add(prior.id);

    const score = similarity(obligationText(draft), obligationText(prior));
    proposals.push({
      newObligationId: draft.id,
      priorObligationId: prior.id,
      kind: score >= UNCHANGED_THRESHOLD ? "UNCHANGED" : "AMENDS",
      matchScore: CODE_MATCH_SCORE,
      rationale:
        `Obligation code "${draft.code}" also appears in the superseded circular. ` +
        `Clause text is ${Math.round(score * 100)}% similar.`,
    });
  }

  // Everything else falls back to text similarity. Scored across all remaining
  // pairs first, then assigned best-first, so one strong match cannot be
  // stolen by an earlier, weaker one.
  const remaining = newObligations.filter((d) => !codeMatched.has(d.id));
  const scored: Array<{ draft: MatchableObligation; prior: MatchableObligation; score: number }> = [];
  for (const draft of remaining) {
    for (const prior of priorObligations) {
      if (claimed.has(prior.id)) continue;
      const score = similarity(obligationText(draft), obligationText(prior));
      if (score >= TEXT_MATCH_THRESHOLD) scored.push({ draft, prior, score });
    }
  }
  scored.sort((x, y) => y.score - x.score);

  const assigned = new Set<string>();
  for (const { draft, prior, score } of scored) {
    if (assigned.has(draft.id) || claimed.has(prior.id)) continue;
    assigned.add(draft.id);
    claimed.add(prior.id);
    proposals.push({
      newObligationId: draft.id,
      priorObligationId: prior.id,
      kind: score >= UNCHANGED_THRESHOLD ? "UNCHANGED" : "AMENDS",
      matchScore: score,
      rationale:
        `No code match. Closest clause in the superseded circular is "${prior.code}" ` +
        `at ${Math.round(score * 100)}% text similarity.`,
    });
  }

  for (const draft of remaining) {
    if (assigned.has(draft.id)) continue;
    proposals.push({
      newObligationId: draft.id,
      priorObligationId: null,
      kind: "NEW",
      matchScore: null,
      rationale: "No obligation in the superseded circular matches by code or clause text.",
    });
  }

  // Stable output order: input order of the drafts, so a reviewer sees the
  // same queue on every run.
  const order = new Map(newObligations.map((o, i) => [o.id, i]));
  return proposals.sort((a, b) => order.get(a.newObligationId)! - order.get(b.newObligationId)!);
}
