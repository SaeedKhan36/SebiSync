import type { ExtractionStateType, ValidatedCandidate } from "../state";

function normalize(text: string): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

// Hallucination guard, simple exact-match only (no fuzzy fallback, no retry
// loop — hackathon scope). If citationText isn't found verbatim in any of its
// claimed source chunks, the candidate is dropped.
export async function validateCitation(
  state: ExtractionStateType,
): Promise<Partial<ExtractionStateType>> {
  const validatedCandidates: ValidatedCandidate[] = [];
  const errors: string[] = [];

  for (const candidate of state.candidates) {
    const sourceChunks = candidate.sourceChunkIndexes
      .map((idx) => state.chunks[idx])
      .filter((c): c is NonNullable<typeof c> => c != null);

    const normalizedCitation = normalize(candidate.citationText);
    const found = sourceChunks.some((chunk) => normalize(chunk.text).includes(normalizedCitation));

    if (found) {
      validatedCandidates.push({ candidate, citationValid: true });
    } else {
      errors.push(`Dropped candidate "${candidate.code}": citationText not found verbatim in source chunk(s)`);
    }
  }

  return { validatedCandidates, errors };
}
