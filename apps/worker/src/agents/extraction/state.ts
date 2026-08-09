import { Annotation } from "@langchain/langgraph";
import type { ObligationCandidate } from "@sebi/schemas";
import type { DocumentChunk } from "@sebi/db";
import type { CitationMatchMode } from "./citationMatch";

export interface ValidatedCandidate {
  candidate: ObligationCandidate;
  // How the quote was found in its source chunk. EXACT is the strict reading
  // (whitespace/case only); NORMALIZED means typographic artefacts had to be
  // folded first — see citationMatch.ts. Reported per-run so a drift towards
  // NORMALIZED stays visible instead of silently widening the guard.
  matchMode: CitationMatchMode;
}

export interface ApplicabilityResolved {
  candidate: ObligationCandidate;
  categoryIds: string[];
}

// The pipeline narrows candidates at three points, and each drop used to be
// visible only as a count. Benchmarking needs to know *which* obligation was
// lost and *where*, so a missed ground-truth item can be attributed to the
// citation guard vs. classification vs. never being extracted at all.
export type DropStage = "CITATION" | "APPLICABILITY" | "PERSIST";

export interface DroppedCandidate {
  code: string;
  title: string;
  citationText: string;
  stage: DropStage;
  reason: string;
}

export const ExtractionState = Annotation.Root({
  documentId: Annotation<string>,
  chunks: Annotation<DocumentChunk[]>({ default: () => [], reducer: (_, next) => next }),
  candidates: Annotation<ObligationCandidate[]>({ default: () => [], reducer: (_, next) => next }),
  validatedCandidates: Annotation<ValidatedCandidate[]>({
    default: () => [],
    reducer: (_, next) => next,
  }),
  applicabilityResolved: Annotation<ApplicabilityResolved[]>({
    default: () => [],
    reducer: (_, next) => next,
  }),
  droppedCandidates: Annotation<DroppedCandidate[]>({
    default: () => [],
    reducer: (curr, next) => [...curr, ...next],
  }),
  errors: Annotation<string[]>({ default: () => [], reducer: (curr, next) => [...curr, ...next] }),
});

export type ExtractionStateType = typeof ExtractionState.State;
