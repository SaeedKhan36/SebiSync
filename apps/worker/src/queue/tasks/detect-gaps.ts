import { schedules, logger } from "@trigger.dev/sdk";
import { detectGaps } from "../../services/detectGaps";

// Cron interval is configurable via GAP_DETECTION_CRON (default: every 5
// minutes) rather than hardcoded, since a hackathon demo wants a much
// tighter loop than a real production cadence would — set the env var
// per-environment instead of editing this file. detectGaps() itself is
// already idempotent (dedupes via an existingUnresolved check), so
// overlapping/duplicate runs are harmless by construction; retry/backoff on
// this task (from trigger.config.ts's global default) is still useful for
// transient DB errors.
//
// The manual POST /internal/detect-gaps route (server.ts) is kept as-is
// alongside this schedule — a demo-time fallback to force a pass on demand
// without waiting for the next tick.
export const detectGapsTask = schedules.task({
  id: "detect-gaps",
  cron: process.env.GAP_DETECTION_CRON ?? "*/5 * * * *",
  run: async (payload) => {
    logger.info("detect-gaps.start", { scheduledAt: payload.timestamp });
    const result = await detectGaps();
    logger.info("detect-gaps.complete", { created: result.created });
    return result;
  },
});
