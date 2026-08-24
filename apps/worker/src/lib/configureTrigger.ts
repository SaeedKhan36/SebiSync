import { configure } from "@trigger.dev/sdk";

// Trigger.dev SDK 4.x treats VERCEL_GIT_COMMIT_REF as a preview/dev branch
// name and sends it as `x-trigger-branch`. Vercel sets that env on production
// too (usually "main"), so `ingestDocumentTask.trigger()` then fails with
// "No matching branch env" and the document is marked FAILED with 0
// obligations — which is exactly what the upload UI showed.
export function shouldBlankPreviewBranch(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.VERCEL_ENV === "production" && !env.TRIGGER_PREVIEW_BRANCH;
}

export function configureTriggerClient(env: NodeJS.ProcessEnv = process.env): void {
  if (shouldBlankPreviewBranch(env)) {
    // Empty string is intentional: the SDK's branchName getter coalesces it
    // to undefined and omits the header, which `undefined` on configure()
    // would not — that still falls through to VERCEL_GIT_COMMIT_REF.
    configure({ previewBranch: "" });
  }
}

export function describeTriggerEnqueueError(message: string): string {
  if (/no matching branch env/i.test(message)) {
    return (
      "Ingestion could not be queued: Trigger.dev has no matching branch environment. " +
      "Production Vercel was sending the git branch as a preview branch."
    );
  }
  return message;
}

const QUEUED_STALE_MS = 60_000;

export function describeIngestionRunStatus(run: {
  isQueued: boolean;
  isFailed: boolean;
  createdAt: Date | string;
  error?: { message?: string } | string | null;
}): string | null {
  if (run.isFailed) {
    const message =
      typeof run.error === "string"
        ? run.error
        : run.error?.message ?? "Ingestion run failed";
    return describeTriggerEnqueueError(message);
  }
  if (run.isQueued && Date.now() - new Date(run.createdAt).getTime() >= QUEUED_STALE_MS) {
    return (
      "Ingestion is queued but no worker has picked it up. " +
      "Production is sending jobs to the Trigger.dev development environment, " +
      "which only runs while `npx trigger.dev dev` is active. " +
      "Set Vercel TRIGGER_SECRET_KEY to the production (tr_prod_) key."
    );
  }
  return null;
}

export function productionUsesDevTriggerKey(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.VERCEL_ENV === "production" && (env.TRIGGER_SECRET_KEY ?? "").startsWith("tr_dev_");
}
