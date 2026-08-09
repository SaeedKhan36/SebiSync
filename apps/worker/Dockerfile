# Worker image for Render.
#
# Build context is the REPO ROOT, not apps/worker — the worker depends on the
# @sebi/db and @sebi/schemas workspace packages, and bun needs the root
# package.json + bun.lock to resolve the workspace graph at all. render.yaml
# sets `dockerContext: .` for this reason.
#
# Two stages with two different runtimes, deliberately:
#   - bun installs, because it is the package manager the lockfile was written
#     by and the only one that understands the `workspace:*` protocol used here.
#   - node runs, because Prisma's query engine is best supported on Node and
#     this is not the place to find out otherwise.

# ---------- build ----------
FROM oven/bun:1.3 AS build
WORKDIR /app

# Copy manifests before source so the dependency layer is cached across code
# changes. Every workspace package's package.json must be present or bun
# cannot resolve the workspace graph.
COPY package.json bun.lock turbo.json ./
COPY apps/worker/package.json ./apps/worker/
COPY apps/web/package.json ./apps/web/
COPY packages/config/package.json ./packages/config/
COPY packages/db/package.json ./packages/db/
COPY packages/schemas/package.json ./packages/schemas/

RUN bun install --frozen-lockfile

COPY packages ./packages
COPY apps/worker ./apps/worker

# Generates the Prisma client into node_modules/.prisma. Needs only the schema,
# never a live database — no DATABASE_URL is required at build time.
RUN cd packages/db && bunx prisma generate

# esbuild bundle: inlines the TypeScript workspace packages and rewrites
# extensionless imports, leaving npm deps external. See apps/worker/build.mjs.
RUN cd apps/worker && bun run build

# ---------- runtime ----------
FROM node:20-slim AS runtime
WORKDIR /app

# Prisma's query engine links against OpenSSL; node:20-slim does not ship it.
# Without this the client fails at first query, not at startup, which is a
# considerably worse place to discover the problem.
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production

# The bundle leaves npm packages external, so node_modules ships with it.
# packages/ comes along because bun leaves workspace symlinks inside
# node_modules/@sebi/* pointing there; the bundle does not read them, but a
# dangling symlink in the image is a trap for the next person debugging it.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages
COPY --from=build /app/apps/worker/dist ./apps/worker/dist
COPY --from=build /app/apps/worker/package.json ./apps/worker/

# Render injects PORT; server.ts falls back to 8787 for local runs.
ENV PORT=8787
EXPOSE 8787

USER node

CMD ["node", "apps/worker/dist/server.js"]
