// Production build for the worker.
//
// `tsc` alone cannot produce a runnable artifact here, for two independent
// reasons — both of which made the previous `node dist/server.js` start command
// fail immediately:
//
//   1. The source uses extensionless relative imports ("./trpc/router"). TypeScript
//      emits them verbatim, and Node's ESM resolver requires the ".js" extension,
//      so the very first relative import threw ERR_MODULE_NOT_FOUND.
//   2. @sebi/db and @sebi/schemas are workspace packages whose "main" points at
//      TypeScript source (index.ts / src/index.ts). Node cannot load those at all,
//      and tsc does not emit them into the worker's dist.
//
// Bundling fixes both: esbuild rewrites the relative specifiers and inlines the
// workspace packages, leaving a single self-contained entry point.
//
// Everything from npm stays EXTERNAL and is resolved from node_modules at
// runtime. That is deliberate rather than lazy — @prisma/client in particular
// must not be bundled, since it loads a platform-specific query engine binary at
// runtime and bundling severs it from its generated client.

import { build } from "esbuild";

// Bundle workspace packages; externalise everything else. Written as a resolver
// rather than an `external` list so a newly added dependency is externalised
// automatically instead of being silently inlined the first time someone forgets
// to update the list.
const externalizeNpmPackages = {
  name: "externalize-npm-packages",
  setup(pluginBuild) {
    pluginBuild.onResolve({ filter: /.*/ }, (args) => {
      if (args.kind === "entry-point") return null;

      const isRelative = args.path.startsWith(".") || args.path.startsWith("/");
      if (isRelative) return null;

      // Workspace packages ship TypeScript and must be inlined.
      if (args.path.startsWith("@sebi/")) return null;

      // node: builtins and every npm package — left for Node to resolve.
      return { external: true };
    });
  },
};

await build({
  entryPoints: ["src/server.ts"],
  outfile: "dist/server.js",
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  sourcemap: true,
  // Surfaces the real file in stack traces instead of the bundled offset.
  sourcesContent: false,
  plugins: [externalizeNpmPackages],
  logLevel: "info",
});
