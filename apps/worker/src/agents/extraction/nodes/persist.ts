import { prisma } from "@sebi/db";
import { writeAuditLog } from "../../../lib/audit";
import type { ExtractionStateType } from "../state";

// Creates a fresh DRAFT Obligation + ObligationSourceChunk rows for every
// validated, applicability-resolved candidate. No NEW/MODIFIED/UNCHANGED
// branching — every extraction run persists new DRAFT obligations.
export async function persist(state: ExtractionStateType): Promise<Partial<ExtractionStateType>> {
  const errors: string[] = [];

  for (const { candidate, categoryIds } of state.applicabilityResolved) {
    try {
      const obligation = await prisma.obligation.create({
        data: {
          documentId: state.documentId,
          code: candidate.code,
          title: candidate.title,
          description: candidate.description,
          obligatedAction: candidate.obligatedAction,
          triggerEvent: candidate.triggerEvent,
          frequency: candidate.frequency,
          deadlineDays: candidate.deadlineDays,
          deadlineBasis: candidate.deadlineBasis,
          penaltyOrRisk: candidate.penaltyOrRisk,
          citationText: candidate.citationText,
          citationPage: candidate.citationPage,
          citationSection: candidate.citationSection,
          extractionConfidence: candidate.extractionConfidence,
          status: "DRAFT",
          applicableCategories: { connect: categoryIds.map((id) => ({ id })) },
        },
      });

      const sourceChunkIds = candidate.sourceChunkIndexes
        .map((idx) => state.chunks[idx]?.id)
        .filter((id): id is string => id != null);

      if (sourceChunkIds.length > 0) {
        await prisma.obligationSourceChunk.createMany({
          data: sourceChunkIds.map((chunkId) => ({ obligationId: obligation.id, chunkId })),
          skipDuplicates: true,
        });
      }

      await writeAuditLog({
        entityType: "Obligation",
        entityId: obligation.id,
        action: "CREATED",
        actorType: "SYSTEM_AGENT",
        afterState: obligation,
        obligationId: obligation.id,
      });
    } catch (error) {
      errors.push(
        `Failed to persist candidate "${candidate.code}": ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  return { errors };
}
