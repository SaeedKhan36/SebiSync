import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createDocumentSchema, docStatusSchema } from "@sebi/schemas";
import { router, protectedProcedure, adminProcedure } from "../trpc";
import { writeAuditLog } from "../../lib/audit";
import { log } from "../../lib/logger";
import { describeIngestionRunStatus, describeTriggerEnqueueError, productionUsesDevTriggerKey } from "../../lib/configureTrigger";
import { ingestDocumentTask } from "../../queue/tasks/ingestion";
import { runs } from "@trigger.dev/sdk";

const DEV_KEY_ON_PRODUCTION =
  "Production is using a Trigger.dev development key, so ingest jobs queue until a local `npx trigger.dev dev` is running. Set Vercel TRIGGER_SECRET_KEY to the production (tr_prod_) key.";

export const documentRouter = router({
  create: adminProcedure.input(createDocumentSchema).mutation(async ({ ctx, input }) => {
    const document = await ctx.prisma.regulatoryDocument.create({
      data: {
        title: input.title,
        circularNumber: input.circularNumber,
        issuedDate: input.issuedDate,
        sourceUrl: input.sourceUrl ?? "",
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
      if (productionUsesDevTriggerKey()) {
        log.error("document.triggerExtraction.dev-key-on-production", { documentId: input.documentId });
        await ctx.prisma.regulatoryDocument.update({
          where: { id: input.documentId },
          data: { status: "FAILED" },
        });
        await writeAuditLog({
          entityType: "RegulatoryDocument",
          entityId: input.documentId,
          action: "STATUS_CHANGED",
          actorType: "SYSTEM_AGENT",
          metadata: { error: DEV_KEY_ON_PRODUCTION, phase: "enqueue" },
        });
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: DEV_KEY_ON_PRODUCTION });
      }

      await ctx.prisma.regulatoryDocument.update({
        where: { id: input.documentId },
        data: { status: "PARSING" },
      });

      // idempotencyKey = documentId (bare, no suffix) for the first attempt —
      // guards against a double-click/double-submit enqueueing two runs for
      // the same document. Enqueuing itself (.trigger()) is a fast API call,
      // not the pipeline execution, so awaiting it doesn't block on the
      // actual ingestion work — but it's still wrapped in try/catch so a
      // Trigger.dev outage marks the document FAILED (and records why) instead
      // of leaving it stuck in PARSING. The mutation then throws so the
      // upload UI does not toast success.
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
        const message = describeTriggerEnqueueError(
          error instanceof Error ? error.message : String(error),
        );
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
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message });
      }
    }),

  // Re-triggers ingestion for a document stuck in FAILED, or still sitting in
  // PARSING/EXTRACTING because the previous run never left the queue. A fresh,
  // timestamped idempotency key (not the bare documentId) so a genuine retry
  // isn't deduped away by the original attempt's now-irrelevant key.
  retryExtraction: adminProcedure
    .input(z.object({ documentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const document = await ctx.prisma.regulatoryDocument.findUniqueOrThrow({
        where: { id: input.documentId },
      });
      const retryable = new Set(["FAILED", "PARSING", "EXTRACTING", "PARSED"]);
      if (!retryable.has(document.status)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Document ${input.documentId} cannot be retried (current: ${document.status})`,
        });
      }

      if (document.lastIngestionRunId) {
        try {
          await runs.cancel(document.lastIngestionRunId);
        } catch (error) {
          log.error("document.retryExtraction.cancel-failed", {
            documentId: input.documentId,
            runId: document.lastIngestionRunId,
            error: error instanceof Error ? error.message : String(error),
          });
        }
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
        const message = describeTriggerEnqueueError(
          error instanceof Error ? error.message : String(error),
        );
        log.error("document.retryExtraction.enqueue-failed", { documentId: input.documentId, error: message });
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
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message });
      }
    }),

  list: protectedProcedure
    .input(
      z.object({
        status: docStatusSchema.optional(),
        search: z.string().optional(),
        cursor: z.string().optional(),
        limit: z.number().int().min(1).max(100).default(20),
      }),
    )
    .query(({ ctx, input }) =>
      ctx.prisma.regulatoryDocument.findMany({
        where: {
          status: input.status,
          ...(input.search
            ? {
                OR: [
                  { title: { contains: input.search, mode: "insensitive" } },
                  { circularNumber: { contains: input.search, mode: "insensitive" } },
                ],
              }
            : {}),
        },
        orderBy: { createdAt: "desc" },
        take: input.limit,
        ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
      }),
    ),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const document = await ctx.prisma.regulatoryDocument.findUniqueOrThrow({
        where: { id: input.id },
        include: { _count: { select: { obligations: true, chunks: true } } },
      });

      let lastError: string | null = null;
      if (document.status === "FAILED") {
        const failure = await ctx.prisma.auditLogEntry.findFirst({
          where: {
            entityType: "RegulatoryDocument",
            entityId: document.id,
            action: "STATUS_CHANGED",
          },
          orderBy: { createdAt: "desc" },
          select: { metadata: true },
        });
        const metadata = failure?.metadata;
        if (
          metadata &&
          typeof metadata === "object" &&
          "error" in metadata &&
          typeof metadata.error === "string"
        ) {
          lastError = describeTriggerEnqueueError(metadata.error);
        }
      } else if (
        (document.status === "PARSING" || document.status === "EXTRACTING") &&
        document.lastIngestionRunId
      ) {
        try {
          const run = await runs.retrieve(document.lastIngestionRunId);
          lastError = describeIngestionRunStatus(run);
        } catch (error) {
          log.error("document.get.run-status-failed", {
            documentId: document.id,
            runId: document.lastIngestionRunId,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      return { ...document, lastError };
    }),
});
