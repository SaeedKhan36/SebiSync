import "dotenv/config";
import { defineConfig } from "@trigger.dev/sdk";
import { additionalPackages } from "@trigger.dev/build/extensions/core";
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
    extensions: [
      // Bundles the debian Prisma query engine into the deploy image so tasks
      // can talk to Neon (schema lives in the monorepo packages/db package).
      prismaExtension({
        mode: "legacy",
        schema: "../../packages/db/prisma/schema.prisma",
        version: "6.19.3",
      }),
      // pdfjs-dist is never imported by any source file. unpdf reaches it at
      // runtime via import.meta.resolve("pdfjs-dist/package.json") purely to
      // locate its standard_fonts/ and cmaps/ data directories — so a bundler
      // that only follows static imports will drop it, and PDF parsing then
      // silently loses font and CJK encoding data in the deployed image.
      // Declaring it here forces it into the install.
      additionalPackages({ packages: ["pdfjs-dist"] }),
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
