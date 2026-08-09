import { matchCitation } from "../citationMatch";
import type { DroppedCandidate, ExtractionStateType, ValidatedCandidate } from "../state";

// Hallucination guard. If citationText can't be located in any of its claimed
// source chunks, the candidate is dropped — no fuzzy fallback and no retry
// loop, because the product's trust claim is that every published obligation
// quotes text that provably exists in the circular.
//
// The matching itself lives in citationMatch.ts (pure, unit-tested); this node
// only records the outcome. Dropped candidates are now kept in state rather
// than reduced to a log line, so the benchmark can tell "the guard rejected
// this" apart from "the model never found it".
export async function validateCitation(
  state: ExtractionStateType,
): Promise<Partial<ExtractionStateType>> {
  const validatedCandidates: ValidatedCandidate[] = [];
  const droppedCandidates: DroppedCandidate[] = [];
  const errors: string[] = [];

  for (const candidate of state.candidates) {
    const sourceChunks = candidate.sourceChunkIndexes
      .map((idx) => state.chunks[idx])
      .filter((c): c is NonNullable<typeof c> => c != null);

    const matchMode = matchCitation(
      candidate.citationText,
      sourceChunks.map((chunk) => chunk.text),
    );

    if (matchMode) {
      validatedCandidates.push({ candidate, matchMode });
    } else {
      const reason = "citationText not found in source chunk(s), even after typographic normalisation";
      droppedCandidates.push({
        code: candidate.code,
        title: candidate.title,
        citationText: candidate.citationText,
        stage: "CITATION",
        reason,
      });
      errors.push(`Dropped candidate "${candidate.code}": ${reason}`);
    }
  }

  return { validatedCandidates, droppedCandidates, errors };
}
