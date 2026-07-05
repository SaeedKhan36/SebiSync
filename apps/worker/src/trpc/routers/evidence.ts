import { z } from "zod";
import { evidenceConfirmSchema, evidenceUploadRequestSchema } from "@sebi/schemas";
import { router, publicProcedure } from "../trpc";
import { writeAuditLog } from "../../lib/audit";

export const evidenceRouter = router({
  getUploadUrl: publicProcedure
    .input(evidenceUploadRequestSchema)
    .mutation(async ({ input }) => {
      const { getPresignedUploadUrl } = await import("../../storage/r2");
      const r2ObjectKey = `evidence/${input.checklistItemId}/${Date.now()}-${input.fileName}`;
      const uploadUrl = await getPresignedUploadUrl(r2ObjectKey, input.contentType);
      return { uploadUrl, r2ObjectKey };
    }),

  confirmUpload: publicProcedure
    .input(evidenceConfirmSchema)
    .mutation(async ({ ctx, input }) => {
      const checklistItem = await ctx.prisma.complianceChecklistItem.findUniqueOrThrow({
        where: { id: input.checklistItemId },
      });
      const evidence = await ctx.prisma.evidenceRecord.create({
        data: {
          checklistItemId: input.checklistItemId,
          clientId: checklistItem.clientId,
          evidenceType: input.evidenceType,
          r2ObjectKey: input.r2ObjectKey,
          description: input.description,
          submittedByUserId: input.submittedByUserId,
          validUntil: input.validUntil,
        },
      });
      // Simple rule: any non-expired evidence marks the item COMPLIANT.
      // Refined gap-aware logic lives in jobs/detectGaps.ts.
      await ctx.prisma.complianceChecklistItem.update({
        where: { id: input.checklistItemId },
        data: { lastEvidenceAt: evidence.submittedAt, status: "COMPLIANT" },
      });
      await writeAuditLog({
        intermediaryId: checklistItem.intermediaryId,
        entityType: "EvidenceRecord",
        entityId: evidence.id,
        action: "EVIDENCE_UPLOADED",
        actorType: "USER",
        actorUserId: input.submittedByUserId,
        afterState: evidence,
        checklistItemId: input.checklistItemId,
        evidenceRecordId: evidence.id,
      });
      return evidence;
    }),

  listByChecklistItem: publicProcedure
    .input(z.object({ checklistItemId: z.string() }))
    .query(({ ctx, input }) =>
      ctx.prisma.evidenceRecord.findMany({
        where: { checklistItemId: input.checklistItemId },
        orderBy: { submittedAt: "desc" },
      }),
    ),
});
