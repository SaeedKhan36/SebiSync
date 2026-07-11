import { task, logger } from "@trigger.dev/sdk";
import { prisma } from "@sebi/db";
import { propagateObligation } from "../../services/propagateObligation";

interface PropagateObligationPayload {
  obligationId: string;
}

// Wraps propagateObligation's per-intermediary/per-client fan-out loop as a
// single retryable task. Unlike ingest-document, this task owns writing
// Obligation.fanOutStatus — IN_PROGRESS on entry, COMPLETED on success; the
// onFailure hook (below) sets FAILED once Trigger.dev's own retries are
// exhausted, not on every individual attempt. Per-intermediary batchTrigger
// parallelization is a future improvement, not built here — this single
// task wraps the existing loop as-is.
export const propagateObligationTask = task({
  id: "propagate-obligation",
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 2000,
    maxTimeoutInMs: 30_000,
    factor: 2,
    randomize: true,
  },
  run: async (payload: PropagateObligationPayload, { ctx }) => {
    logger.info("propagate-obligation.start", {
      obligationId: payload.obligationId,
      runId: ctx.run.id,
    });

    await prisma.obligation.update({
      where: { id: payload.obligationId },
      data: { fanOutStatus: "IN_PROGRESS" },
    });

    await propagateObligation(payload.obligationId);

    await prisma.obligation.update({
      where: { id: payload.obligationId },
      data: { fanOutStatus: "COMPLETED", fanOutError: null },
    });
    logger.info("propagate-obligation.complete", { obligationId: payload.obligationId });
  },
  onFailure: async ({ payload, error }) => {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("propagate-obligation.failed", { obligationId: payload.obligationId, error: message });
    await prisma.obligation.update({
      where: { id: payload.obligationId },
      data: { fanOutStatus: "FAILED", fanOutError: message },
    });
  },
});
