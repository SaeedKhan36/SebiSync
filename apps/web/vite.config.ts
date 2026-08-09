import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  // Fail loudly if port 3000 is already taken instead of drifting to the next
  // free port — a moved origin silently breaks the worker's CORS allowlist and
  // surfaces only as "Failed to fetch" from every tRPC call.
  server: { strictPort: true },
  plugins: [devtools(), tailwindcss(), tanstackStart(), viteReact()],
})

export default config
