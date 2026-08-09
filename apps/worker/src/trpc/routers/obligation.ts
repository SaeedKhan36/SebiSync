import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { obligationStatusSchema } from "@sebi/schemas";
import { router, protectedProcedure, adminProcedure } from "../trpc";
import { writeAuditLog } from "../../lib/audit";
import { log } from "../../lib/logger";
import { propagateObligationTask } from "../../queue/tasks/propagate-obligation";
import { supersedeObligation } from "../../services/supersedeObligation";

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
          // Amendment lineage, both directions, so the detail panel can show
          // "replaces X" on the successor and "replaced by Y" on the retired
          // one without a second round trip.
          supersedes: { select: { id: true, code: true, title: true, status: true } },
          supersededBy: { select: { id: true, code: true, title: true, status: true } },
          proposalAsNew: {
            include: {
              priorObligation: { select: { id: true, code: true, title: true, status: true } },
            },
          },
        },
      }),
    ),

  // The amendment review queue: drafts extracted from a circular that
  // supersedes an earlier one, each with the machine's proposed mapping.
  // Ordered so the decisions that actually retire a live requirement (AMENDS)
  // come before the ones that only add (NEW).
  supersessionProposals: protectedProcedure
    .input(z.object({ documentId: z.string().optional() }).optional())
    .query(({ ctx, input }) =>
      ctx.prisma.supersessionProposal.findMany({
        where: {
          status: "PROPOSED",
          newObligation: input?.documentId ? { documentId: input.documentId } : undefined,
        },
        include: {
          newObligation: {
            select: {
              id: true,
              code: true,
              title: true,
              status: true,
              obligatedAction: true,
              document: { select: { id: true, title: true, circularNumber: true } },
            },
          },
          priorObligation: {
            select: {
              id: true,
              code: true,
              title: true,
              status: true,
              obligatedAction: true,
              document: { select: { id: true, title: true, circularNumber: true } },
            },
          },
        },
        orderBy: [{ kind: "asc" }, { matchScore: "desc" }],
      }),
    ),

  // Records the reviewer's decision on a proposed amendment mapping. It does
  // NOT retire anything: accepting the mapping only sets supersedesId on the
  // draft, and the prior obligation is retired at publish time (see below).
  // Keeping retirement on the publish gate means there is never a moment where
  // the old requirement is off and the new one is not yet live.
  decideSupersession: adminProcedure
    .input(
      z.object({
        proposalId: z.string(),
        decision: z.enum(["CONFIRM", "REJECT"]),
        // Lets a reviewer overrule the machine: confirm a mapping the matcher
        // proposed as NEW, or detach one it wrongly paired.
        priorObligationId: z.string().nullish(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const proposal = await ctx.prisma.supersessionProposal.findUniqueOrThrow({
        where: { id: input.proposalId },
        include: { newObligation: { select: { id: true, status: true } } },
      });
      if (proposal.status !== "PROPOSED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Proposal ${input.proposalId} has already been decided (${proposal.status})`,
        });
      }
      if (proposal.newObligation.status !== "DRAFT") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            `Obligation ${proposal.newObligationId} is ${proposal.newObligation.status}, not DRAFT — ` +
            `its supersession mapping can no longer be changed`,
        });
      }

      const priorObligationId =
        input.priorObligationId === undefined ? proposal.priorObligationId : input.priorObligationId;

      if (input.decision === "CONFIRM" && priorObligationId) {
        // The schema's 1:1 relation would reject this at write time anyway;
        // failing here turns a constraint violation into an explicable error.
        const alreadyClaimed = await ctx.prisma.obligation.findFirst({
          where: { supersedesId: priorObligationId, id: { not: proposal.newObligationId } },
          select: { id: true, code: true },
        });
        if (alreadyClaimed) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `That obligation is already superseded by ${alreadyClaimed.code}`,
          });
        }
      }

      await ctx.prisma.obligation.update({
        where: { id: proposal.newObligationId },
        data: {
          supersedesId: input.decision === "CONFIRM" ? priorObligationId : null,
        },
      });

      const updated = await ctx.prisma.supersessionProposal.update({
        where: { id: input.proposalId },
        data: {
          status: input.decision === "CONFIRM" ? "CONFIRMED" : "REJECTED",
          priorObligationId,
          decidedByUserId: ctx.userId,
          decidedAt: new Date(),
        },
      });

      await writeAuditLog({
        entityType: "Obligation",
        entityId: proposal.newObligationId,
        action: "SUPERSESSION_DECIDED",
        actorType: "USER",
        actorUserId: ctx.userId,
        beforeState: { status: proposal.status, priorObligationId: proposal.priorObligationId },
        afterState: { status: updated.status, priorObligationId },
        obligationId: proposal.newObligationId,
      });

      return updated;
    }),

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
  publish: adminProcedure
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

      // If this obligation was confirmed as an amendment, the requirement it
      // replaces is retired in the same request — the new rule going live and
      // the old one being switched off are one event, not two. Awaited inline
      // (unlike fan-out) because it is a handful of scoped updates, and
      // because leaving both versions in force even briefly is exactly the
      // ambiguity this feature removes.
      if (updated.supersedesId) {
        await supersedeObligation(updated.supersedesId, updated.id, ctx.userId);
      }

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
