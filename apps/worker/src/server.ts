import dotenv from "dotenv";
import path from "node:path";

// Load packages/db/.env explicitly so DATABASE_URL doesn't need to be
// duplicated into apps/worker/.env.
dotenv.config({ path: path.resolve(import.meta.dirname, "../../../packages/db/.env") });
dotenv.config(); // apps/worker/.env for worker-specific vars, if present

import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { trpcServer } from "@hono/trpc-server";
import { appRouter } from "./trpc/router";
import { createContext } from "./trpc/context";
import { detectGaps } from "./services/detectGaps";

const app = new Hono();

// The frontend (apps/web) runs on a different origin/port, so requests need
// CORS + credentials to carry the Clerk session/auth header cross-origin.
app.use(
  "*",
  cors({
    origin: process.env.WEB_ORIGIN ?? "http://localhost:3000",
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization"],
  }),
);

app.get("/health", (c) => c.json({ status: "ok" }));

app.use(
  "/trpc/*",
  trpcServer({
    router: appRouter,
    createContext,
  }),
);

// Trigger layer only: this route's one job is to call the detectGaps()
// service function and return its result. No scheduler dependency by design —
// a future cron/QStash/Vercel Cron trigger would call detectGaps() the same
// way, without touching the business logic in services/detectGaps.ts.
app.post("/internal/detect-gaps", async (c) => {
  const result = await detectGaps();
  return c.json(result);
});

const port = Number(process.env.PORT ?? 8787);
serve({ fetch: app.fetch, port });
console.log(`@sebi/worker listening on port ${port}`);
