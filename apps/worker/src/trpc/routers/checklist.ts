import { z } from "zod";
import { checklistStatusSchema, createTriggerEventSchema, updateChecklistStatusSchema } from "@sebi/schemas";
import type { Prisma } from "@sebi/db";
import { router, publicProcedure } from "../trpc";
import { writeAuditLog } from "../../lib/audit";

export const checklistRouter = router({
  listByIntermediary: publicProcedure
    .input(
      z.object({
        intermediaryId: z.string(),
        status: checklistStatusSchema.optional(),
        clientId: z.string().optional(),
      }),
    )
    .query(({ ctx, input }) =>
      ctx.prisma.complianceChecklistItem.findMany({
        where: {
          intermediaryId: input.intermediaryId,
          status: input.status,
          clientId: input.clientId,
        },
        include: { obligation: true, client: true },
        orderBy: { createdAt: "desc" },
      }),
    ),

  getDetail: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) =>
      ctx.prisma.complianceChecklistItem.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          obligation: true,
          client: true,
          triggerEvent: true,
          evidenceRecords: { orderBy: { submittedAt: "desc" } },
          gaps: { orderBy: { detectedAt: "desc" } },
        },
      }),
    ),

  // Creates a TriggerEvent + its ComplianceChecklistItem together for a
  // PER_EVENT obligation (e.g. a SCORES complaint starting the 21-day clock).
  createTriggerEvent: publicProcedure
    .input(createTriggerEventSchema)
    .mutation(async ({ ctx, input }) => {
      const obligation = await ctx.prisma.obligation.findUniqueOrThrow({
        where: { id: input.obligationId },
      });
      if (obligation.frequency !== "PER_EVENT" || obligation.deadlineDays == null) {
        throw new Error(
          `Obligation ${input.obligationId} is not a PER_EVENT obligation with a deadline`,
        );
      }
      const dueDate = new Date(input.eventDate);
      dueDate.setDate(dueDate.getDate() + obligation.deadlineDays);

      const triggerEvent = await ctx.prisma.triggerEvent.create({
        data: {
          obligationId: input.obligationId,
          intermediaryId: input.intermediaryId,
          clientId: input.clientId,
          eventType: input.eventType,
          eventDate: input.eventDate,
          referenceNo: input.referenceNo,
          metadata: input.metadata as Prisma.InputJsonValue | undefined,
        },
      });
      const checklistItem = await ctx.prisma.complianceChecklistItem.create({
        data: {
          intermediaryId: input.intermediaryId,
          obligationId: input.obligationId,
          clientId: input.clientId,
          triggerEventId: triggerEvent.id,
          dueDate,
          status: "PENDING",
        },
      });
      await writeAuditLog({
        intermediaryId: input.intermediaryId,
        entityType: "ChecklistItem",
        entityId: checklistItem.id,
        action: "TRIGGER_EVENT_RECEIVED",
        actorType: "USER",
        metadata: { triggerEventDate: input.eventDate, referenceNo: input.referenceNo },
        checklistItemId: checklistItem.id,
      });
      return checklistItem;
    }),

  updateStatus: publicProcedure
    .input(updateChecklistStatusSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.complianceChecklistItem.findUniqueOrThrow({
        where: { id: input.id },
      });
      const updated = await ctx.prisma.complianceChecklistItem.update({
        where: { id: input.id },
        data: { status: input.status, assignedToUserId: input.assignedToUserId },
      });
      await writeAuditLog({
        intermediaryId: updated.intermediaryId,
        entityType: "ChecklistItem",
        entityId: updated.id,
        action: "STATUS_CHANGED",
        actorType: "USER",
        beforeState: { status: existing.status },
        afterState: { status: updated.status },
        checklistItemId: updated.id,
      });
      return updated;
    }),
});
