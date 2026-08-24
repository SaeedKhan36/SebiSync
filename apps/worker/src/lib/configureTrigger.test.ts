import { describe, expect, it } from "vitest";
import {
  describeIngestionRunStatus,
  describeTriggerEnqueueError,
  productionUsesDevTriggerKey,
  shouldBlankPreviewBranch,
} from "./configureTrigger";

describe("shouldBlankPreviewBranch", () => {
  it("blanks the branch on Vercel production so git ref is not sent as a preview branch", () => {
    expect(
      shouldBlankPreviewBranch({
        VERCEL_ENV: "production",
        VERCEL_GIT_COMMIT_REF: "main",
      }),
    ).toBe(true);
  });

  it("leaves preview deployments alone so they can target a matching branch env", () => {
    expect(
      shouldBlankPreviewBranch({
        VERCEL_ENV: "preview",
        VERCEL_GIT_COMMIT_REF: "feat/upload",
      }),
    ).toBe(false);
  });

  it("does not blank when TRIGGER_PREVIEW_BRANCH is set explicitly", () => {
    expect(
      shouldBlankPreviewBranch({
        VERCEL_ENV: "production",
        TRIGGER_PREVIEW_BRANCH: "hotfix",
      }),
    ).toBe(false);
  });

  it("does nothing locally, where VERCEL_ENV is unset", () => {
    expect(shouldBlankPreviewBranch({})).toBe(false);
  });
});

describe("describeTriggerEnqueueError", () => {
  it("rewrites the Trigger.dev branch-env failure into an actionable message", () => {
    expect(describeTriggerEnqueueError("No matching branch env")).toMatch(/preview branch/);
  });

  it("passes other enqueue errors through unchanged", () => {
    expect(describeTriggerEnqueueError("rate limited")).toBe("rate limited");
  });
});

describe("describeIngestionRunStatus", () => {
  it("explains a run that has been queued for over a minute", () => {
    expect(
      describeIngestionRunStatus({
        isQueued: true,
        isFailed: false,
        createdAt: new Date(Date.now() - 90_000),
      }),
    ).toMatch(/no worker has picked it up/i);
  });

  it("stays silent while a fresh run is still queued", () => {
    expect(
      describeIngestionRunStatus({
        isQueued: true,
        isFailed: false,
        createdAt: new Date(),
      }),
    ).toBeNull();
  });

  it("surfaces a failed run's error", () => {
    expect(
      describeIngestionRunStatus({
        isQueued: false,
        isFailed: true,
        createdAt: new Date(),
        error: { message: "Gemini quota exceeded" },
      }),
    ).toBe("Gemini quota exceeded");
  });
});

describe("productionUsesDevTriggerKey", () => {
  it("detects a development key on Vercel production", () => {
    expect(
      productionUsesDevTriggerKey({
        VERCEL_ENV: "production",
        TRIGGER_SECRET_KEY: "tr_dev_example",
      }),
    ).toBe(true);
  });

  it("allows a production key on Vercel production", () => {
    expect(
      productionUsesDevTriggerKey({
        VERCEL_ENV: "production",
        TRIGGER_SECRET_KEY: "tr_prod_example",
      }),
    ).toBe(false);
  });
});
