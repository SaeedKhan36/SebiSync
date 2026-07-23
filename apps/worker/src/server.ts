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

// Fixed-window in-memory rate limit on mutation-capable tRPC traffic. Single
// process only (no shared store) — acceptable for this deployment's scale;
// swap for a Redis-backed limiter if the worker ever runs multi-instance.
// Keyed by the (session-bearing) Authorization header when present, falling
// back to the caller's IP, so one noisy client can't starve everyone else.
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 120;
const rateLimitHits = new Map<string, { count: number; windowStart: number }>();

app.use("/trpc/*", async (c, next) => {
  if (c.req.method !== "POST") return next();

  const key = c.req.header("Authorization") ?? c.req.header("x-forwarded-for") ?? "anonymous";
  const now = Date.now();
  const entry = rateLimitHits.get(key);

  if (!entry || now - entry.windowStart >= RATE_LIMIT_WINDOW_MS) {
    rateLimitHits.set(key, { count: 1, windowStart: now });
  } else {
    entry.count += 1;
    if (entry.count > RATE_LIMIT_MAX) {
      return c.json({ error: "rate_limited" }, 429);
    }
  }

  // Opportunistic cleanup of stale windows so the map doesn't grow unbounded.
  if (rateLimitHits.size > 1000) {
    for (const [k, v] of rateLimitHits) {
      if (now - v.windowStart >= RATE_LIMIT_WINDOW_MS) rateLimitHits.delete(k);
    }
  }

  return next();
});

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
// way, without touching the business logic in services/detectGaps.ts. Guarded
// by a shared secret since it's otherwise unauthenticated — the Trigger.dev
// cron calls detectGaps() directly in-process and never hits this route, so
// the guard is purely additive for anyone probing the HTTP surface.
app.post("/internal/detect-gaps", async (c) => {
  const secret = process.env.INTERNAL_API_SECRET;
  if (!secret || c.req.header("x-internal-secret") !== secret) {
    return c.json({ error: "unauthorized" }, 401);
  }
  const result = await detectGaps();
  return c.json(result);
});

const port = Number(process.env.PORT ?? 8787);
serve({ fetch: app.fetch, port });
console.log(`@sebi/worker listening on port ${port}`);
