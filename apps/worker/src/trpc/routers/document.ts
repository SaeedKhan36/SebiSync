import { z } from "zod";
import { createDocumentSchema, docStatusSchema } from "@sebi/schemas";
import { router, protectedProcedure } from "../trpc";
import { writeAuditLog } from "../../lib/audit";
import { runIngestionWorkflow } from "../../ingestion/workflow";

export const documentRouter = router({
  create: protectedProcedure.input(createDocumentSchema).mutation(async ({ ctx, input }) => {
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

  getUploadUrl: protectedProcedure
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

  triggerExtraction: protectedProcedure
    .input(z.object({ documentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.regulatoryDocument.update({
        where: { id: input.documentId },
        data: { status: "PARSING" },
      });
      // Fire-and-forget: hackathon scale, single linear pipeline, no queue.
      void runIngestionWorkflow(input.documentId);
      return { status: "PARSING" as const };
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
