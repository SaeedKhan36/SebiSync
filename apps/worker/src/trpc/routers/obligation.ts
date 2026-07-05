import { z } from "zod";
import { obligationStatusSchema } from "@sebi/schemas";
import { router, publicProcedure } from "../trpc";
import { writeAuditLog } from "../../lib/audit";
import { propagateObligation } from "../../jobs/propagateObligation";

export const obligationRouter = router({
  list: publicProcedure
    .input(
      z.object({
        documentId: z.string().optional(),
        status: obligationStatusSchema.optional(),
        categoryCode: z.string().optional(),
      }),
    )
    .query(({ ctx, input }) =>
      ctx.prisma.obligation.findMany({
        where: {
          documentId: input.documentId,
          status: input.status,
          applicableCategories: input.categoryCode
            ? { some: { code: input.categoryCode } }
            : undefined,
        },
        include: { applicableCategories: true },
        orderBy: { createdAt: "desc" },
      }),
    ),

  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) =>
      ctx.prisma.obligation.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          document: true,
          applicableCategories: true,
          sourceChunks: { include: { chunk: true } },
        },
      }),
    ),

  // DRAFT -> PUBLISHED directly. No intermediate REVIEWED state for hackathon scope.
  publish: publicProcedure
    .input(z.object({ id: z.string(), reviewedByUserId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.obligation.findUniqueOrThrow({ where: { id: input.id } });
      if (existing.status !== "DRAFT") {
        throw new Error(`Obligation ${input.id} is not in DRAFT status (current: ${existing.status})`);
      }
      const updated = await ctx.prisma.obligation.update({
        where: { id: input.id },
        data: { status: "PUBLISHED", reviewedByUserId: input.reviewedByUserId },
      });
      await writeAuditLog({
        entityType: "Obligation",
        entityId: updated.id,
        action: "STATUS_CHANGED",
        actorType: "USER",
        actorUserId: input.reviewedByUserId,
        beforeState: { status: existing.status },
        afterState: { status: updated.status },
        obligationId: updated.id,
      });
      await propagateObligation(updated.id);
      return updated;
    }),
});
