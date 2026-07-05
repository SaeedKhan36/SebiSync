import { z } from "zod";
import { obligationStatusSchema } from "@sebi/schemas";
import { router, protectedProcedure } from "../trpc";
import { writeAuditLog } from "../../lib/audit";
import { propagateObligation } from "../../services/propagateObligation";

export const obligationRouter = router({
  list: protectedProcedure
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

  get: protectedProcedure
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
  // reviewedByUserId comes from the authenticated Clerk session, not client input,
  // so a caller can't attribute a publish action to an arbitrary user.
  publish: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.obligation.findUniqueOrThrow({ where: { id: input.id } });
      if (existing.status !== "DRAFT") {
        throw new Error(`Obligation ${input.id} is not in DRAFT status (current: ${existing.status})`);
      }
      const updated = await ctx.prisma.obligation.update({
        where: { id: input.id },
        data: { status: "PUBLISHED", reviewedByUserId: ctx.userId },
      });
      await writeAuditLog({
        entityType: "Obligation",
        entityId: updated.id,
        action: "STATUS_CHANGED",
        actorType: "USER",
        actorUserId: ctx.userId,
        beforeState: { status: existing.status },
        afterState: { status: updated.status },
        obligationId: updated.id,
      });
      await propagateObligation(updated.id);
      return updated;
    }),
});
