import { z } from "zod";
import { gapSeveritySchema, resolveGapSchema } from "@sebi/schemas";
import { router, publicProcedure } from "../trpc";
import { writeAuditLog } from "../../lib/audit";

export const gapRouter = router({
  list: publicProcedure
    .input(
      z.object({
        intermediaryId: z.string(),
        severity: gapSeveritySchema.optional(),
        resolved: z.boolean().optional(),
      }),
    )
    .query(({ ctx, input }) =>
      ctx.prisma.complianceGap.findMany({
        where: {
          checklistItem: { intermediaryId: input.intermediaryId },
          severity: input.severity,
          resolvedAt: input.resolved === undefined ? undefined : input.resolved ? { not: null } : null,
        },
        include: { checklistItem: { include: { obligation: true, client: true } } },
        orderBy: { detectedAt: "desc" },
      }),
    ),

  resolve: publicProcedure.input(resolveGapSchema).mutation(async ({ ctx, input }) => {
    const gap = await ctx.prisma.complianceGap.update({
      where: { id: input.gapId },
      data: { resolvedAt: new Date(), resolutionNote: input.resolutionNote },
      include: { checklistItem: true },
    });
    await writeAuditLog({
      intermediaryId: gap.checklistItem.intermediaryId,
      entityType: "ComplianceGap",
      entityId: gap.id,
      action: "GAP_RESOLVED",
      actorType: "USER",
      actorUserId: input.resolvedByUserId,
      afterState: { resolutionNote: input.resolutionNote },
      checklistItemId: gap.checklistItemId,
      gapId: gap.id,
    });
    return gap;
  }),
});
