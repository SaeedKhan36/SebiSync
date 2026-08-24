import { task, logger } from "@trigger.dev/sdk";
import { prisma } from "@sebi/db";
import { writeAuditLog } from "../../lib/audit";
import { runIngestionWorkflow } from "../../ingestion/workflow";

interface IngestDocumentPayload {
  documentId: string;
}

// Wraps runIngestionWorkflow (parse -> chunk -> embed -> extract) as a
// single retryable task rather than decomposing into subtasks — the
// function's own try/catch/status-update logic is reused verbatim, and
// task-level retry (below) covers the whole pipeline without needing
// separate step boundaries for a hackathon-scale document volume.
//
// Idempotency: the router passes an idempotencyKey derived from documentId
// on .trigger(), which stops Trigger.dev from enqueueing a truly duplicate
// concurrent run within the TTL window. On top of that, this task
// re-checks the document's own status on entry and no-ops if it's already
// EXTRACTED — covers the case of a stale/expired idempotency key or a
// manual retry racing an already-completed run, without touching
// runIngestionWorkflow's own internals.
export const ingestDocumentTask = task({
  id: "ingest-document",
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 2000,
    maxTimeoutInMs: 30_000,
    factor: 2,
    randomize: true,
  },
  run: async (payload: IngestDocumentPayload, { ctx }) => {
    logger.info("ingest-document.start", { documentId: payload.documentId, runId: ctx.run.id });

    const document = await prisma.regulatoryDocument.findUniqueOrThrow({
      where: { id: payload.documentId },
    });
    if (document.status === "EXTRACTED") {
      logger.info("ingest-document.already-complete", { documentId: payload.documentId });
      return { skipped: true as const };
    }

    await runIngestionWorkflow(payload.documentId);
    logger.info("ingest-document.complete", { documentId: payload.documentId });
    return { skipped: false as const };
  },
  // Platform-level failures (timeout, OOM, never-started crash) skip the
  // workflow's own catch, which would otherwise leave the document PARSING
  // forever. Mirrors propagate-obligation: fire once retries are exhausted.
  onFailure: async ({ payload, error }) => {
    const message = error instanceof Error ? error.message : String(error);
    if (/cancel/i.test(message)) {
      logger.info("ingest-document.canceled", { documentId: payload.documentId });
      return;
    }
    logger.error("ingest-document.failed", { documentId: payload.documentId, error: message });
    await prisma.regulatoryDocument.update({
      where: { id: payload.documentId },
      data: { status: "FAILED" },
    });
    await writeAuditLog({
      entityType: "RegulatoryDocument",
      entityId: payload.documentId,
      action: "STATUS_CHANGED",
      actorType: "SYSTEM_AGENT",
      metadata: { error: message, phase: "task" },
    });
  },
});
