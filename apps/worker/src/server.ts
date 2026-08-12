// Long-running Node listener. Used by `bun run dev` locally and by the Render
// Docker image; the Vercel deployment does NOT go through this file — it wraps
// src/app.ts directly from api/index.ts.
//
// Keep this thin. Anything added here is invisible to the Vercel deployment,
// which is exactly the kind of divergence that produces a bug reproducible in
// one environment and not the other. Route and middleware changes belong in
// src/app.ts.

import dotenv from "dotenv";
import path from "node:path";

// Load packages/db/.env explicitly so DATABASE_URL doesn't need to be
// duplicated into apps/worker/.env. On Vercel this is a no-op that never runs —
// env vars come from the platform — which is the other reason it lives here and
// not in app.ts.
dotenv.config({ path: path.resolve(import.meta.dirname, "../../../packages/db/.env") });
dotenv.config(); // apps/worker/.env for worker-specific vars, if present

import { serve } from "@hono/node-server";

// Dynamic, not a static import. ESM hoists every static import above the module
// body, so a plain `import app from "./app"` would evaluate the whole router —
// and construct the Prisma client — before the dotenv.config() calls above had
// run. It happens to survive that today only because Prisma resolves its
// datasource URL lazily on first query; anything that reads process.env at
// module scope would silently see undefined.
const { default: app } = await import("./app");

const port = Number(process.env.PORT ?? 8787);
serve({ fetch: app.fetch, port });
console.log(`@sebi/worker listening on port ${port}`);
