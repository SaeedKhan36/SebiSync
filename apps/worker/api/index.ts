// Vercel serverless entry point for the worker.
//
// Every request to this project lands here — vercel.json rewrites /(.*) to
// /api, so Hono's own router does the path matching exactly as it does under
// the Node server. There is deliberately no second copy of the route table.
//
// Node runtime, not Edge. That is forced, not a preference: the router pulls in
// @prisma/client (native query-engine binary), @aws-sdk/client-s3 and
// @google/genai, none of which run on the Edge runtime. Setting
// `runtime: "edge"` here fails at build, or worse, at first query.
//
// No dotenv here — Vercel injects environment variables into the function's
// process.env directly, and apps/worker/.env is never uploaded.
//
// The import below points at the esbuild BUNDLE (dist/app.js, produced by the
// buildCommand), not at src/app.ts. That is load-bearing: Vercel's Node builder
// transpiles TypeScript per-file rather than bundling, and src/ uses
// extensionless relative imports that Node's ESM resolver refuses, so importing
// the source deploys fine and then fails every request with
// ERR_MODULE_NOT_FOUND. See the comment on the second build() in build.mjs.
//
// Named HTTP method exports (not `export default`) are required on Vercel's
// Node runtime: a default export that returns a Web Response is treated as the
// legacy `(req, res) => void` handler, the Response is ignored, and Hono then
// sees a Node IncomingMessage — which is what produced
// `headers.get is not a function` + a 60s FUNCTION_INVOCATION_TIMEOUT on
// /health. Named exports select the Web Handler API instead.

import { handle } from "hono/vercel";
import app from "../dist/app.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handler = handle(app);

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const OPTIONS = handler;
export const HEAD = handler;
