import "dotenv/config";
import { defineConfig } from "@trigger.dev/sdk";

// project ref comes from the Trigger.dev dashboard once a project exists —
// see TRIGGER_PROJECT_REF in .env. Task files live under src/queue/tasks/
// rather than the default auto-detected "trigger" directory name, since
// apps/worker/src/queue/ was already the established (if previously empty)
// home for job/queue infra in this codebase.
export default defineConfig({
  project: process.env.TRIGGER_PROJECT_REF ?? "",
  runtime: "node",
  logLevel: "info",
  dirs: ["./src/queue/tasks"],
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 30_000,
      factor: 2,
      randomize: true,
    },
  },
});
