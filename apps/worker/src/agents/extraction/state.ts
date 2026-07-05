import { Annotation } from "@langchain/langgraph";
import type { ObligationCandidate } from "@sebi/schemas";
import type { DocumentChunk } from "@sebi/db";

export interface ValidatedCandidate {
  candidate: ObligationCandidate;
  citationValid: boolean;
}

export interface ApplicabilityResolved {
  candidate: ObligationCandidate;
  categoryIds: string[];
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
  errors: Annotation<string[]>({ default: () => [], reducer: (curr, next) => [...curr, ...next] }),
});

export type ExtractionStateType = typeof ExtractionState.State;
