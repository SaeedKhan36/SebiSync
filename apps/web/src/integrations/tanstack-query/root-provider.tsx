import type { ReactNode } from 'react'
import { QueryClient } from '@tanstack/react-query'
import superjson from 'superjson'
import { createTRPCClient, httpBatchLink } from '@trpc/client'
import { createTRPCOptionsProxy } from '@trpc/tanstack-react-query'

import type { AppRouter } from '@sebi/worker'
import { TRPCProvider } from '#/integrations/trpc/react'

function getUrl() {
  const base = import.meta.env.VITE_WORKER_URL ?? 'http://localhost:8787'
  return `${base}/trpc`
}

// With SSR disabled for /_authenticated (see that route's comment), route
// loaders now fire entirely client-side — but they can fire before Clerk's
// browser SDK has finished restoring the session from cookies, leaving
// window.Clerk.session momentarily null even for an actually-signed-in user.
// Poll briefly rather than racing it: resolves in a few ms in practice, and
// still correctly falls through to "no token" for a genuinely signed-out
// user once the timeout elapses.
async function waitForClerkSession(timeoutMs = 4000): Promise<void> {
  const start = Date.now()
  while (!window.Clerk?.session && Date.now() - start < timeoutMs) {
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
}

// The real @sebi/worker backend has no transformer configured (plain JSON),
// so the client must not use superjson for the wire format either — this is
// a separate concern from the QueryClient's own dehydrate/hydrate transform
// below, which only affects in-app React Query cache serialization.
export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: getUrl(),
      // Forwards the active Clerk session token so the backend's Hono/tRPC
      // auth middleware can verify it (see apps/worker/src/lib/auth.ts).
      async headers() {
        if (typeof window === 'undefined') return {}
        await waitForClerkSession()
        const token = await window.Clerk?.session?.getToken()
        return token ? { Authorization: `Bearer ${token}` } : {}
      },
    }),
  ],
})

export function getContext() {
  const queryClient = new QueryClient({
    defaultOptions: {
      dehydrate: { serializeData: superjson.serialize },
      hydrate: { deserializeData: superjson.deserialize },
    },
  })

  const serverHelpers = createTRPCOptionsProxy({
    client: trpcClient,
    queryClient: queryClient,
  })
  const context = {
    queryClient,
    trpc: serverHelpers,
  }

  return context
}

export default function TanstackQueryProvider({
  children,
  context,
}: {
  children: ReactNode
  context: ReturnType<typeof getContext>
}) {
  const { queryClient } = context

  return (
    <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
      {children}
    </TRPCProvider>
  )
}
