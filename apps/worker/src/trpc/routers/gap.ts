import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { gapSeveritySchema, resolveGapSchema } from "@sebi/schemas";
import { router, orgProcedure } from "../trpc";
import { writeAuditLog } from "../../lib/audit";

export const gapRouter = router({
  list: orgProcedure
    .input(
      z.object({
        severity: gapSeveritySchema.optional(),
        resolved: z.boolean().optional(),
      }),
    )
    .query(({ ctx, input }) =>
      ctx.prisma.complianceGap.findMany({
        where: {
          checklistItem: { intermediaryId: ctx.intermediaryId },
          severity: input.severity,
          resolvedAt: input.resolved === undefined ? undefined : input.resolved ? { not: null } : null,
        },
        include: { checklistItem: { include: { obligation: true, client: true } } },
        orderBy: { detectedAt: "desc" },
      }),
    ),

  resolve: orgProcedure.input(resolveGapSchema).mutation(async ({ ctx, input }) => {
    const existing = await ctx.prisma.complianceGap.findUniqueOrThrow({
      where: { id: input.gapId },
      include: { checklistItem: true },
    });
    if (existing.checklistItem.intermediaryId !== ctx.intermediaryId) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Gap belongs to another organization" });
    }
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
      actorUserId: ctx.userId,
      afterState: { resolutionNote: input.resolutionNote },
      checklistItemId: gap.checklistItemId,
      gapId: gap.id,
    });
    return gap;
  }),
});
