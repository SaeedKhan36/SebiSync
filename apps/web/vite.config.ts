import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  // TanStack Start builds the client and prerender shell in separate phases.
  // On Vercel, the shell has occasionally retained the previous CSS content
  // hash even though the client phase emitted a new one, leaving production
  // unstyled. There is only one CSS bundle, so give it a stable filename and
  // remove that cross-phase failure mode.
  build: {
    rolldownOptions: {
      output: {
        assetFileNames: (assetInfo) =>
          assetInfo.names.some((name) => name.endsWith('.css'))
            ? 'assets/styles.css'
            : 'assets/[name]-[hash][extname]',
      },
    },
  },
  // Fail loudly if port 3000 is already taken instead of drifting to the next
  // free port — a moved origin silently breaks the worker's CORS allowlist and
  // surfaces only as "Failed to fetch" from every tRPC call.
  server: { strictPort: true },
  plugins: [
    devtools(),
    tailwindcss(),
    // SPA output rather than SSR, which makes the Vercel deploy a pure static
    // site with no serverless function to cold-start or fail.
    //
    // SSR was buying nothing here. Auth is @clerk/clerk-react — the
    // client-only package — so the server has no session and would render every
    // authenticated route logged-out before hydration corrected it. And with
    // the entire app behind /_authenticated, there is no SEO or
    // first-paint-content argument either: all data arrives from the worker
    // over tRPC after mount regardless.
    //
    // The shell is prerendered to index.html so the browser still gets real
    // markup rather than an empty div.
    //
    // To go back to SSR: drop the `spa` option, and give Vercel a server
    // preset — dist/server/server.js is a Node server, not a static asset.
    // outputPath defaults to _shell.html, which no static host serves at "/".
    // Emitting index.html means Vercel serves the root without a rewrite, and
    // deep links fall back to it via the rewrite in vercel.json.
    // TanStack otherwise uses os.cpus().length. Some constrained CI/sandbox
    // environments report 0 CPUs, creating a queue with zero workers and
    // hanging forever at "Prerendering pages... Concurrency: 0".
    tanstackStart({
      prerender: { concurrency: 1 },
      spa: { enabled: true, prerender: { outputPath: 'index.html' } },
    }),
    viteReact(),
  ],
})

export default config
