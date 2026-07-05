import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { evidenceConfirmSchema, evidenceUploadRequestSchema } from "@sebi/schemas";
import { router, orgProcedure } from "../trpc";
import { writeAuditLog } from "../../lib/audit";

async function assertOwnedByOrg(
  prisma: import("@sebi/db").PrismaClient,
  checklistItemId: string,
  intermediaryId: string,
) {
  const item = await prisma.complianceChecklistItem.findUniqueOrThrow({
    where: { id: checklistItemId },
  });
  if (item.intermediaryId !== intermediaryId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Checklist item belongs to another organization" });
  }
  return item;
}

export const evidenceRouter = router({
  getUploadUrl: orgProcedure
    .input(evidenceUploadRequestSchema)
    .mutation(async ({ ctx, input }) => {
      await assertOwnedByOrg(ctx.prisma, input.checklistItemId, ctx.intermediaryId);
      const { getPresignedUploadUrl } = await import("../../storage/r2");
      const r2ObjectKey = `evidence/${input.checklistItemId}/${Date.now()}-${input.fileName}`;
      const uploadUrl = await getPresignedUploadUrl(r2ObjectKey, input.contentType);
      return { uploadUrl, r2ObjectKey };
    }),

  confirmUpload: orgProcedure
    .input(evidenceConfirmSchema)
    .mutation(async ({ ctx, input }) => {
      const checklistItem = await assertOwnedByOrg(ctx.prisma, input.checklistItemId, ctx.intermediaryId);
      const evidence = await ctx.prisma.evidenceRecord.create({
        data: {
          checklistItemId: input.checklistItemId,
          clientId: checklistItem.clientId,
          evidenceType: input.evidenceType,
          r2ObjectKey: input.r2ObjectKey,
          description: input.description,
          submittedByUserId: ctx.userId,
          validUntil: input.validUntil,
        },
      });
      // Simple rule: any non-expired evidence marks the item COMPLIANT.
      // Refined gap-aware logic lives in services/detectGaps.ts.
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
        actorUserId: ctx.userId,
        afterState: evidence,
        checklistItemId: input.checklistItemId,
        evidenceRecordId: evidence.id,
      });
      return evidence;
    }),

  listByChecklistItem: orgProcedure
    .input(z.object({ checklistItemId: z.string() }))
    .query(async ({ ctx, input }) => {
      await assertOwnedByOrg(ctx.prisma, input.checklistItemId, ctx.intermediaryId);
      return ctx.prisma.evidenceRecord.findMany({
        where: { checklistItemId: input.checklistItemId },
        orderBy: { submittedAt: "desc" },
      });
    }),
});
