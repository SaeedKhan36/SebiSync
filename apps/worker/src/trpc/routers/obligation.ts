import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { obligationStatusSchema } from "@sebi/schemas";
import { router, protectedProcedure } from "../trpc";
import { writeAuditLog } from "../../lib/audit";
import { log } from "../../lib/logger";
import { propagateObligationTask } from "../../queue/tasks/propagate-obligation";

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
  //
  // Checklist fan-out (propagateObligation) now runs as a Trigger.dev task
  // instead of being awaited inline — the mutation returns as soon as the
  // obligation is PUBLISHED, not after every intermediary/client checklist
  // item has been created. fanOutStatus tracks that separately (see the
  // Obligation model): PENDING here, IN_PROGRESS/COMPLETED/FAILED written by
  // the task itself. Enqueueing (.trigger()) is a fast API call, wrapped in
  // try/catch so a Trigger.dev outage doesn't fail the publish mutation
  // itself — it degrades to fanOutStatus FAILED with an explanatory error
  // instead.
  publish: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.obligation.findUniqueOrThrow({ where: { id: input.id } });
      if (existing.status !== "DRAFT") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Obligation ${input.id} is not in DRAFT status (current: ${existing.status})`,
        });
      }
      const updated = await ctx.prisma.obligation.update({
        where: { id: input.id },
        data: { status: "PUBLISHED", reviewedByUserId: ctx.userId, fanOutStatus: "PENDING" },
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

      try {
        const handle = await propagateObligationTask.trigger(
          { obligationId: updated.id },
          { idempotencyKey: updated.id, idempotencyKeyTTL: "10m" },
        );
        return ctx.prisma.obligation.update({
          where: { id: updated.id },
          data: { fanOutRunId: handle.id },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        log.error("obligation.publish.fanout-enqueue-failed", { obligationId: updated.id, error: message });
        return ctx.prisma.obligation.update({
          where: { id: updated.id },
          data: { fanOutStatus: "FAILED", fanOutError: message },
        });
      }
    }),
});
