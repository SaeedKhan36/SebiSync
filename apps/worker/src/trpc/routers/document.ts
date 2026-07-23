import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createDocumentSchema, docStatusSchema } from "@sebi/schemas";
import { router, protectedProcedure, adminProcedure } from "../trpc";
import { writeAuditLog } from "../../lib/audit";
import { log } from "../../lib/logger";
import { ingestDocumentTask } from "../../queue/tasks/ingestion";

export const documentRouter = router({
  create: adminProcedure.input(createDocumentSchema).mutation(async ({ ctx, input }) => {
    const document = await ctx.prisma.regulatoryDocument.create({
      data: {
        title: input.title,
        circularNumber: input.circularNumber,
        issuedDate: input.issuedDate,
        sourceUrl: input.sourceUrl,
        supersedesId: input.supersedesId,
        r2ObjectKey: "",
        status: "UPLOADED",
      },
    });
    await writeAuditLog({
      entityType: "RegulatoryDocument",
      entityId: document.id,
      action: "CREATED",
      actorType: "USER",
      afterState: document,
    });
    return document;
  }),

  getUploadUrl: adminProcedure
    .input(z.object({ documentId: z.string(), fileName: z.string(), contentType: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { getPresignedUploadUrl } = await import("../../storage/r2");
      const r2ObjectKey = `documents/${input.documentId}/${input.fileName}`;
      const uploadUrl = await getPresignedUploadUrl(r2ObjectKey, input.contentType);
      await ctx.prisma.regulatoryDocument.update({
        where: { id: input.documentId },
        data: { r2ObjectKey },
      });
      return { uploadUrl, r2ObjectKey };
    }),

  triggerExtraction: adminProcedure
    .input(z.object({ documentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.regulatoryDocument.update({
        where: { id: input.documentId },
        data: { status: "PARSING" },
      });

      // idempotencyKey = documentId (bare, no suffix) for the first attempt —
      // guards against a double-click/double-submit enqueueing two runs for
      // the same document. Enqueuing itself (.trigger()) is a fast API call,
      // not the pipeline execution, so awaiting it doesn't block on the
      // actual ingestion work — but it's still wrapped in try/catch so a
      // Trigger.dev outage degrades to a clear FAILED status instead of a
      // raw 500 back to the client.
      try {
        const handle = await ingestDocumentTask.trigger(
          { documentId: input.documentId },
          { idempotencyKey: input.documentId, idempotencyKeyTTL: "10m" },
        );
        await ctx.prisma.regulatoryDocument.update({
          where: { id: input.documentId },
          data: { lastIngestionRunId: handle.id },
        });
        return { status: "PARSING" as const, runId: handle.id };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        log.error("document.triggerExtraction.enqueue-failed", { documentId: input.documentId, error: message });
        await ctx.prisma.regulatoryDocument.update({
          where: { id: input.documentId },
          data: { status: "FAILED" },
        });
        await writeAuditLog({
          entityType: "RegulatoryDocument",
          entityId: input.documentId,
          action: "STATUS_CHANGED",
          actorType: "SYSTEM_AGENT",
          metadata: { error: message, phase: "enqueue" },
        });
        return { status: "FAILED" as const, runId: null };
      }
    }),

  // Re-triggers ingestion for a document stuck in FAILED — a fresh,
  // timestamped idempotency key (not the bare documentId) so a genuine retry
  // isn't deduped away by the original attempt's now-irrelevant key.
  retryExtraction: adminProcedure
    .input(z.object({ documentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const document = await ctx.prisma.regulatoryDocument.findUniqueOrThrow({
        where: { id: input.documentId },
      });
      if (document.status !== "FAILED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Document ${input.documentId} is not FAILED (current: ${document.status})`,
        });
      }

      await ctx.prisma.regulatoryDocument.update({
        where: { id: input.documentId },
        data: { status: "PARSING" },
      });

      try {
        const handle = await ingestDocumentTask.trigger(
          { documentId: input.documentId },
          { idempotencyKey: `retry-${input.documentId}-${Date.now()}` },
        );
        await ctx.prisma.regulatoryDocument.update({
          where: { id: input.documentId },
          data: { lastIngestionRunId: handle.id },
        });
        await writeAuditLog({
          entityType: "RegulatoryDocument",
          entityId: input.documentId,
          action: "STATUS_CHANGED",
          actorType: "USER",
          actorUserId: ctx.userId,
          metadata: { action: "retry", runId: handle.id },
        });
        return { status: "PARSING" as const, runId: handle.id };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        log.error("document.retryExtraction.enqueue-failed", { documentId: input.documentId, error: message });
        await ctx.prisma.regulatoryDocument.update({
          where: { id: input.documentId },
          data: { status: "FAILED" },
        });
        return { status: "FAILED" as const, runId: null };
      }
    }),

  list: protectedProcedure
    .input(
      z.object({
        status: docStatusSchema.optional(),
        cursor: z.string().optional(),
        limit: z.number().int().min(1).max(100).default(20),
      }),
    )
    .query(({ ctx, input }) =>
      ctx.prisma.regulatoryDocument.findMany({
        where: input.status ? { status: input.status } : undefined,
        orderBy: { createdAt: "desc" },
        take: input.limit,
        ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
      }),
    ),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) =>
      ctx.prisma.regulatoryDocument.findUniqueOrThrow({
        where: { id: input.id },
        include: { _count: { select: { obligations: true, chunks: true } } },
      }),
    ),
});
