// The Hono application, with no reference to how it gets served.
//
// Two entry points wrap this module and they must stay interchangeable:
//   - src/server.ts   long-running Node listener (local dev, and the Render
//                     Docker image if that path is ever revived)
//   - api/index.ts    Vercel serverless function via hono/vercel
//
// Nothing here may assume a persistent process. Anything that needs one (a
// scheduler, a warm cache, a connection pool it owns) belongs in server.ts or
// in a Trigger.dev task, not in this file.

import { Hono } from "hono";
import { cors } from "hono/cors";
import { trpcServer } from "@hono/trpc-server";
import { appRouter } from "./trpc/router";
import { createContext } from "./trpc/context";
import { detectGaps } from "./services/detectGaps";

const app = new Hono();

// The frontend (apps/web) runs on a different origin, so requests need CORS +
// credentials to carry the Clerk session/auth header cross-origin. WEB_ORIGIN
// accepts a comma-separated list so preview deployments can be added without a
// code change.
//
// On Vercel the two projects get different domains (sebisync-web.vercel.app vs
// sebisync-worker.vercel.app), so this stays load-bearing in production — it is
// not just a local-dev concern.
const allowedOrigins = (process.env.WEB_ORIGIN ?? "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

// Vite silently shifts to the next free port when its configured one is taken
// (a stale dev server, another project), which turns every tRPC call into an
// opaque "Failed to fetch" once the origin no longer matches. Outside
// production, trust any loopback port so that mismatch can't happen.
const allowAnyLoopbackOrigin = process.env.NODE_ENV !== "production";
const LOOPBACK_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\]):\d+$/;

// Vercel preview deployments get a fresh generated hostname on every push, so
// they can never be enumerated in WEB_ORIGIN ahead of time. Opting into the
// whole *.vercel.app space would also hand CORS access to every other project
// on the platform, so previews are matched by project prefix only, and only
// when explicitly enabled.
const previewOriginPrefix = process.env.VERCEL_PREVIEW_ORIGIN_PREFIX?.trim();

function isAllowedOrigin(origin: string): boolean {
  if (allowedOrigins.includes(origin)) return true;
  if (allowAnyLoopbackOrigin && LOOPBACK_ORIGIN.test(origin)) return true;
  if (previewOriginPrefix) {
    try {
      const { hostname, protocol } = new URL(origin);
      if (
        protocol === "https:" &&
        hostname.startsWith(previewOriginPrefix) &&
        hostname.endsWith(".vercel.app")
      ) {
        return true;
      }
    } catch {
      return false;
    }
  }
  return false;
}

app.use(
  "*",
  cors({
    origin: (origin) => (isAllowedOrigin(origin) ? origin : null),
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization"],
  }),
);

app.get("/health", (c) => c.json({ status: "ok" }));

// Fixed-window rate limit on mutation-capable tRPC traffic.
//
// The store is a plain in-process Map, which means the limit is per-instance.
// On a long-running server that is the whole story; on Vercel it degrades to
// "per warm lambda", so the effective ceiling is RATE_LIMIT_MAX times however
// many instances are warm. That is a real weakening and it is accepted here
// rather than papered over: it still stops a single client hammering one
// instance, and the alternative is a Redis/KV round-trip on every mutation.
// If this ever needs to be a real limit, back it with Vercel KV / Upstash —
// don't just raise the number.
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
// a cron trigger (Trigger.dev, Vercel Cron, QStash) calls detectGaps() the same
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

export default app;
