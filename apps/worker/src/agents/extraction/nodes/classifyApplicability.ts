import { prisma } from "@sebi/db";
import type { ApplicabilityResolved, ExtractionStateType } from "../state";

export async function classifyApplicability(
  state: ExtractionStateType,
): Promise<Partial<ExtractionStateType>> {
  const applicabilityResolved: ApplicabilityResolved[] = [];
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
    for (const code of candidate.applicableCategoryCodes) {
      const id = codeToId.get(code);
      if (id) {
        categoryIds.push(id);
      } else {
        errors.push(`Candidate "${candidate.code}": unknown intermediary category code "${code}"`);
      }
    }
    if (categoryIds.length > 0) {
      applicabilityResolved.push({ candidate, categoryIds });
    }
  }

  return { applicabilityResolved, errors };
}
