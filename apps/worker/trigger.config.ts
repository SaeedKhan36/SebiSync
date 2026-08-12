import "dotenv/config";
import { defineConfig } from "@trigger.dev/sdk";
import { prismaExtension } from "@trigger.dev/build/extensions/prisma";

// project ref comes from the Trigger.dev dashboard once a project exists —
// see TRIGGER_PROJECT_REF in .env. Task files live under src/queue/tasks/
// rather than the default auto-detected "trigger" directory name, since
// apps/worker/src/queue/ was already the established (if previously empty)
// home for job/queue infra in this codebase.
export default defineConfig({
  project: process.env.TRIGGER_PROJECT_REF ?? "",
  runtime: "node",
  logLevel: "info",
  // Required by Trigger.dev ≥4.5; ingestion (parse→embed→extract) can run long.
  maxDuration: 900,
  dirs: ["./src/queue/tasks"],
  build: {
    // Bundles the debian Prisma query engine into the deploy image so tasks
    // can talk to Neon (schema lives in the monorepo packages/db package).
    extensions: [
      prismaExtension({
        mode: "legacy",
        schema: "../../packages/db/prisma/schema.prisma",
        version: "6.19.3",
      }),
    ],
  },
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
