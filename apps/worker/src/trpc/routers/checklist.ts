import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  approveChecklistEvidenceSchema,
  checklistStatusSchema,
  createTriggerEventSchema,
  rejectChecklistEvidenceSchema,
  updateChecklistStatusSchema,
} from "@sebi/schemas";
import type { Prisma } from "@sebi/db";
import { router, orgProcedure, orgAdminProcedure } from "../trpc";
import { writeAuditLog } from "../../lib/audit";

export const checklistRouter = router({
  listByIntermediary: orgProcedure
    .input(
      z.object({
        status: checklistStatusSchema.optional(),
        clientId: z.string().optional(),
      }),
    )
    .query(({ ctx, input }) =>
      ctx.prisma.complianceChecklistItem.findMany({
        where: {
          intermediaryId: ctx.intermediaryId,
          status: input.status,
          clientId: input.clientId,
        },
        include: { obligation: true, client: true },
        orderBy: { createdAt: "desc" },
      }),
    ),

  getDetail: orgProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const item = await ctx.prisma.complianceChecklistItem.findUniqueOrThrow({
      where: { id: input.id },
      include: {
        obligation: true,
        client: true,
        triggerEvent: true,
        evidenceRecords: { orderBy: { submittedAt: "desc" } },
        gaps: { orderBy: { detectedAt: "desc" } },
      },
    });
    if (item.intermediaryId !== ctx.intermediaryId) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Checklist item belongs to another organization" });
    }
    return item;
  }),

  // Creates a TriggerEvent + its ComplianceChecklistItem together for a
  // PER_EVENT obligation (e.g. a SCORES complaint starting the 21-day clock).
  createTriggerEvent: orgProcedure
    .input(createTriggerEventSchema)
    .mutation(async ({ ctx, input }) => {
      const obligation = await ctx.prisma.obligation.findUniqueOrThrow({
        where: { id: input.obligationId },
      });
      if (obligation.frequency !== "PER_EVENT" || obligation.deadlineDays == null) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Obligation ${input.obligationId} is not a PER_EVENT obligation with a deadline`,
        });
      }
      const dueDate = new Date(input.eventDate);
      dueDate.setDate(dueDate.getDate() + obligation.deadlineDays);

      const triggerEvent = await ctx.prisma.triggerEvent.create({
        data: {
          obligationId: input.obligationId,
          intermediaryId: ctx.intermediaryId,
          clientId: input.clientId,
          eventType: input.eventType,
          eventDate: input.eventDate,
          referenceNo: input.referenceNo,
          metadata: input.metadata as Prisma.InputJsonValue | undefined,
        },
      });
      const checklistItem = await ctx.prisma.complianceChecklistItem.create({
        data: {
          intermediaryId: ctx.intermediaryId,
          obligationId: input.obligationId,
          clientId: input.clientId,
          triggerEventId: triggerEvent.id,
          dueDate,
          status: "PENDING",
        },
      });
      await writeAuditLog({
        intermediaryId: ctx.intermediaryId,
        entityType: "ChecklistItem",
        entityId: checklistItem.id,
        action: "TRIGGER_EVENT_RECEIVED",
        actorType: "USER",
        actorUserId: ctx.userId,
        metadata: { triggerEventDate: input.eventDate, referenceNo: input.referenceNo },
        checklistItemId: checklistItem.id,
      });
      return checklistItem;
    }),

  updateStatus: orgProcedure
    .input(updateChecklistStatusSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.complianceChecklistItem.findUniqueOrThrow({
        where: { id: input.id },
      });
      if (existing.intermediaryId !== ctx.intermediaryId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Checklist item belongs to another organization" });
      }
      if (input.status === "COMPLIANT") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Marking an item compliant requires checklist.approve after evidence review",
        });
      }
      if (input.status === "NOT_APPLICABLE" && ctx.orgRole !== "org:admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Admin role required to mark an item not applicable",
        });
      }
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
        actorUserId: ctx.userId,
        beforeState: { status: existing.status },
        afterState: { status: updated.status },
        checklistItemId: updated.id,
      });
      return updated;
    }),

  approve: orgAdminProcedure.input(approveChecklistEvidenceSchema).mutation(async ({ ctx, input }) => {
    const existing = await ctx.prisma.complianceChecklistItem.findUniqueOrThrow({
      where: { id: input.id },
    });
    if (existing.intermediaryId !== ctx.intermediaryId) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Checklist item belongs to another organization" });
    }
    if (existing.status !== "PENDING_REVIEW") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Checklist item ${input.id} is not awaiting review (current: ${existing.status})`,
      });
    }
    const evidenceCount = await ctx.prisma.evidenceRecord.count({
      where: { checklistItemId: input.id },
    });
    if (evidenceCount < 1) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Checklist item ${input.id} has no evidence to approve`,
      });
    }
    const updated = await ctx.prisma.complianceChecklistItem.update({
      where: { id: input.id },
      data: { status: "COMPLIANT" },
    });
    await writeAuditLog({
      intermediaryId: updated.intermediaryId,
      entityType: "ChecklistItem",
      entityId: updated.id,
      action: "EVIDENCE_APPROVED",
      actorType: "USER",
      actorUserId: ctx.userId,
      beforeState: { status: existing.status },
      afterState: { status: updated.status },
      checklistItemId: updated.id,
    });
    return updated;
  }),

  reject: orgAdminProcedure.input(rejectChecklistEvidenceSchema).mutation(async ({ ctx, input }) => {
    const existing = await ctx.prisma.complianceChecklistItem.findUniqueOrThrow({
      where: { id: input.id },
    });
    if (existing.intermediaryId !== ctx.intermediaryId) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Checklist item belongs to another organization" });
    }
    if (existing.status !== "PENDING_REVIEW") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Checklist item ${input.id} is not awaiting review (current: ${existing.status})`,
      });
    }
    const updated = await ctx.prisma.complianceChecklistItem.update({
      where: { id: input.id },
      data: { status: "PENDING" },
    });
    await writeAuditLog({
      intermediaryId: updated.intermediaryId,
      entityType: "ChecklistItem",
      entityId: updated.id,
      action: "EVIDENCE_REJECTED",
      actorType: "USER",
      actorUserId: ctx.userId,
      beforeState: { status: existing.status },
      afterState: { status: updated.status },
      metadata: { reason: input.reason },
      checklistItemId: updated.id,
    });
    return updated;
  }),
});
