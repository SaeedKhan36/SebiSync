# Deployment

Four pieces, three providers:

| Piece | Where | What it is |
|---|---|---|
| `apps/web` | Vercel | Static SPA (no serverless functions) |
| `apps/worker` | Render | Docker web service — tRPC API, ingestion, gap detection |
| `services/docling-sidecar` | Render | Docker web service — PDF parsing |
| Postgres + pgvector | Neon | Already provisioned |

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

## 2. Docling sidecar (Render)

The worker calls this during ingestion; without it, ingest fails at the parse
step and leaves the document stuck in `PARSING`.

Render → New → Blueprint → select this repo. `render.yaml` defines both services.

**It is set to the `standard` plan, and that is not a preference.** The image
bundles docling plus paddleocr/paddlepaddle, which needs well over Render free's
512 MB when the models load. On free it OOMs partway through the first parse.

Confirm `https://<docling>.onrender.com/health` responds before continuing.

---

## 3. Worker (Render)

Created by the same blueprint. Set the secrets Render prompts for — every one is
declared `sync: false` in `render.yaml` so nothing sensitive lives in git. The
full list with explanations is in `apps/worker/.env.example`.

Two that are easy to get wrong:

- **`DOCLING_SIDECAR_URL`** — the sidecar's Render URL, no trailing slash.
- **`WEB_ORIGIN`** — comma-separated CORS allowlist. It must contain your Vercel
  URL. If it does not, nothing errors visibly: every tRPC call just fails with
  "Failed to fetch". You will not have this URL until step 4, so come back and
  set it. **The first entry is also used as the canonical origin for links in
  notification emails**, so put production first and previews after.

Health check is `/health`. On Render's free plan the service sleeps after
inactivity and the first request takes ~50s to wake it — worth warming before a
live demo.

### Why the worker needs a build step at all

`node dist/server.js` did not work before this was set up, for two reasons: the
source uses extensionless relative imports that Node's ESM resolver rejects, and
`@sebi/db`/`@sebi/schemas` ship TypeScript that Node cannot load. `apps/worker/build.mjs`
bundles with esbuild, inlining the workspace packages and leaving npm deps —
notably `@prisma/client`, which loads a native query engine — external.

---

## 4. Frontend (Vercel)

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
- `VITE_WORKER_URL` — the worker's Render URL, no trailing slash

**Vite inlines `VITE_*` at build time.** Changing either one needs a redeploy,
not a restart. And nothing secret may go in a `VITE_*` variable — it ships to the
browser in plain text.

Then go back to Render and add the Vercel URL to `WEB_ORIGIN`.

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

## 5. Post-deploy checks

```bash
curl https://<docling>.onrender.com/health     # {"status":"ok"}
curl https://<worker>.onrender.com/health      # {"status":"ok"}
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

**Not verified: the two Dockerfiles actually build.** The Docker daemon was not
running on the machine where this was set up, so neither image has been built
even once. Do this before you rely on it:

```bash
docker build -f apps/worker/Dockerfile -t sebisync-worker .
docker build -f services/docling-sidecar/Dockerfile -t sebisync-docling services/docling-sidecar
```

The worker build must run from the **repo root** — it needs `packages/` and
`bun.lock` to resolve the workspace graph.
