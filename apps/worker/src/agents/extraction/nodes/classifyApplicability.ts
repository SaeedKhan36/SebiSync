import { prisma } from "@sebi/db";
import type { ApplicabilityResolved, DroppedCandidate, ExtractionStateType } from "../state";

export async function classifyApplicability(
  state: ExtractionStateType,
): Promise<Partial<ExtractionStateType>> {
  const applicabilityResolved: ApplicabilityResolved[] = [];
  const droppedCandidates: DroppedCandidate[] = [];
  const errors: string[] = [];

  const allCodes = [
    ...new Set(state.validatedCandidates.flatMap((v) => v.candidate.applicableCategoryCodes)),
  ];
  const categories = await prisma.intermediaryCategory.findMany({
    where: { code: { in: allCodes } },
  });
  const codeToId = new Map(categories.map((c) => [c.code, c.id]));

  for (const { candidate } of state.validatedCandidates) {
    const categoryIds: string[] = [];
    const unknownCodes: string[] = [];
    for (const code of candidate.applicableCategoryCodes) {
      const id = codeToId.get(code);
      if (id) {
        categoryIds.push(id);
      } else {
        unknownCodes.push(code);
        errors.push(`Candidate "${candidate.code}": unknown intermediary category code "${code}"`);
      }
    }
    if (categoryIds.length > 0) {
      applicabilityResolved.push({ candidate, categoryIds });
    } else {
      // Every claimed category is unseeded, so the obligation would have no
      // tenant to fan out to. Recorded rather than silently dropped: this is
      // almost always a seeding problem (a missing IntermediaryCategory row),
      // not a bad extraction, and the benchmark needs to say so.
      droppedCandidates.push({
        code: candidate.code,
        title: candidate.title,
        citationText: candidate.citationText,
        stage: "APPLICABILITY",
        reason: `no known intermediary category (model proposed: ${unknownCodes.join(", ") || "none"})`,
      });
    }
  }

  return { applicabilityResolved, droppedCandidates, errors };
}
