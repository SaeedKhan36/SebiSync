# Deployment

Three pieces:

| Piece | Where | What it is |
|---|---|---|
| `apps/web` | Vercel | Static SPA (no serverless functions) |
| `apps/worker` | Vercel function (`apps/worker/vercel.json`) | tRPC API; long-running ingestion runs on Trigger.dev |
| Postgres + pgvector | Neon | Already provisioned |

**There is no longer a PDF-parsing service to deploy.** Parsing moved into
TypeScript (`apps/worker/src/ingestion/`): `unpdf` reads the embedded text
layer and any scanned page is OCRed by sending the PDF to Gemini, which
rasterizes it server-side. That removed the Python + PaddleOCR sidecar, its
Render service and `render.yaml` altogether. `services/docling-sidecar/` is
retained on disk for output comparison only and is not deployed.

`apps/worker` also still ships a `Dockerfile` for running it as a long-lived
container on any Docker host, which is what `bun run start` serves locally.

Deploy **worker before frontend**: the frontend bakes the worker's URL into its
bundle at build time, so it needs to exist first.

---

## 1. Database (Neon)

Already running. Apply migrations from your machine — they are deliberately not
run on container boot, since that would race across instances on restart:

```bash
cd packages/db && npx prisma migrate deploy
```

Then seed the reference data, which is not optional:

```bash
bun run db:seed
```

`db:seed` creates all six `IntermediaryCategory` rows. `classifyApplicability`
**silently drops** obligations whose category is unseeded, so a missing row means
extracted obligations vanish with no error anywhere.

Use Neon's **pooled** connection string for the worker. The worker opens a
connection per request and will exhaust a direct endpoint.

---

## 2. Worker

Deploy `apps/worker` — its `vercel.json` handles install, `prisma generate` and
the esbuild bundle, and exposes the Hono app through `api/index.ts`.

Set the secrets listed with explanations in `apps/worker/.env.example`. Two are
easy to get wrong:

- **`GEMINI_API_KEY`** — now load-bearing for parsing as well as extraction.
  Scanned PDFs are OCRed through Gemini, so without this key a scanned circular
  fails at the parse step and the document sticks in `PARSING`. Text-based PDFs
  still parse without it, since `unpdf` needs no API.
- **`WEB_ORIGIN`** — comma-separated CORS allowlist. It must contain your Vercel
  URL. If it does not, nothing errors visibly: every tRPC call just fails with
  "Failed to fetch". You will not have this URL until step 3, so come back and
  set it. **The first entry is also used as the canonical origin for links in
  notification emails**, so put production first and previews after.

Health check is `/health`.

Ingestion itself (parse → chunk → embed → extract) takes minutes, which is
longer than any Vercel function may run, so it executes as a Trigger.dev task
(`maxDuration: 900`); the tRPC route only enqueues it. Set `TRIGGER_SECRET_KEY`
and `TRIGGER_PROJECT_REF` or uploads will enqueue nothing.

### Why the worker needs a build step at all

`node dist/server.js` did not work before this was set up, for two reasons: the
source uses extensionless relative imports that Node's ESM resolver rejects, and
`@sebi/db`/`@sebi/schemas` ship TypeScript that Node cannot load. `apps/worker/build.mjs`
bundles with esbuild, inlining the workspace packages and leaving npm deps —
notably `@prisma/client`, which loads a native query engine — external.

---

## 3. Frontend (Vercel)

Import the repo. `vercel.json` at the root already sets the build:

```
installCommand   bun install
buildCommand     bun run --cwd apps/web build
outputDirectory  apps/web/dist/client
```

Leave **Root Directory as the repo root** — `bun install` needs the workspace
graph, so pointing Vercel at `apps/web` breaks resolution.

Set two environment variables:

- `VITE_CLERK_PUBLISHABLE_KEY`
- `VITE_WORKER_URL` — the worker's deployed URL, no trailing slash

**Vite inlines `VITE_*` at build time.** Changing either one needs a redeploy,
not a restart. And nothing secret may go in a `VITE_*` variable — it ships to the
browser in plain text.

Then go back to the worker's settings and add the Vercel URL to `WEB_ORIGIN`.

### Why SPA and not SSR

`vite.config.ts` sets `spa: { enabled: true }`, so the build emits static files
and Vercel runs no serverless function.

SSR was buying nothing here. Auth is `@clerk/clerk-react`, the client-only
package, so the server has no session and would render every authenticated route
logged-out before hydration corrected it. With the whole app behind
`/_authenticated` there is no SEO argument either, and all data arrives from the
worker over tRPC after mount regardless. The shell is prerendered to
`index.html`, so the browser still receives real markup.

To go back to SSR: drop the `spa` option and give Vercel a server preset —
`dist/server/server.js` is a Node server, not a static asset.

---

## 4. Post-deploy checks

```bash
curl https://<worker>/health      # {"status":"ok"}
```

Then in the browser: load the Vercel URL, sign in, and confirm the dashboard
populates. If the page renders but every panel is empty, it is almost always
`WEB_ORIGIN` — open devtools and look for a CORS failure on the tRPC call.

A production Clerk instance is worth setting up before recording: a `pk_test_`
key works but renders a "Development mode" banner on the sign-in card.

---

## What has and has not been verified

Verified locally:

- `apps/worker` builds and `node dist/server.js` boots and serves `/health` → 200
- `apps/web` builds via the exact Vercel command, emitting `index.html`
- The SPA serves, routes, deep-links through the fallback, and reaches Clerk
  sign-in with no console errors
- `bun run typecheck` clean across 5 packages; full test suite green

Verified without a Docker daemon:

- Every `COPY` source path in the worker Dockerfile exists
- `prisma generate` succeeds with `DATABASE_URL` unset, which is the state it
  runs in inside the image
- `.dockerignore` excludes all four real `.env` files while keeping the
  `.env.example` templates

**Not verified: the worker Dockerfile actually builds.** The Docker daemon was
not running on the machine where this was set up (its backend service needs
Administrator to start), so the image has never been built. Do this before you
rely on it — it is only needed for container hosting, not for the Vercel path:

```bash
docker build -f apps/worker/Dockerfile -t sebisync-worker .
```

The worker build must run from the **repo root** — it needs `packages/` and
`bun.lock` to resolve the workspace graph.

Then confirm no secret was captured in a layer:

```bash
docker run --rm sebisync-worker sh -c "ls -a /app/packages/db /app/apps/worker | grep -c '^\.env$' || echo 'no .env in image'"
```

The root `.dockerignore` is what prevents that, and it is a security control
rather than a build optimisation: `COPY packages` and `COPY apps/worker` would
otherwise bake the Neon password and the Gemini, Clerk, R2 and Resend keys into
a published image layer, where they persist even if a later layer removes them.
