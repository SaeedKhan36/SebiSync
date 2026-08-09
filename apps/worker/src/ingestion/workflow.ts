import { prisma } from "@sebi/db";
import { writeAuditLog } from "../lib/audit";
import { parseDocument } from "./docling-client";
import { chunkDocument } from "./chunker";
import { embedChunks, writeChunkEmbeddings } from "./embed";
import { runExtractionAgent, type ExtractionSummary } from "../agents/extraction/graph";

// Plain async function for hackathon scope — a single linear pipeline run
// synchronously per document. If deployed behind Vercel Workflows, each
// `await` below is where a durable step boundary would go.
export async function runIngestionWorkflow(documentId: string): Promise<ExtractionSummary> {
  const document = await prisma.regulatoryDocument.findUniqueOrThrow({ where: { id: documentId } });

  try {
    const parseResult = await parseDocument(document);
    await prisma.regulatoryDocument.update({ where: { id: documentId }, data: { status: "PARSED" } });

    const chunks = chunkDocument(parseResult);
    const embedded = await embedChunks(chunks);
    await writeChunkEmbeddings(documentId, embedded);

    await prisma.regulatoryDocument.update({
      where: { id: documentId },
      data: { status: "EXTRACTING" },
    });

    const summary = await runExtractionAgent(documentId);

    await prisma.regulatoryDocument.update({
      where: { id: documentId },
      data: { status: "EXTRACTED" },
    });

    return summary;
  } catch (error) {
    await prisma.regulatoryDocument.update({ where: { id: documentId }, data: { status: "FAILED" } });
    await writeAuditLog({
      entityType: "RegulatoryDocument",
      entityId: documentId,
      action: "STATUS_CHANGED",
      actorType: "SYSTEM_AGENT",
      metadata: { error: error instanceof Error ? error.message : String(error) },
    });
    throw error;
  }
}
