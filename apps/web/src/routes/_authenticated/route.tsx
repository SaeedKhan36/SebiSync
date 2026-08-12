import { createFileRoute, Outlet, useNavigate } from '@tanstack/react-router'
import { useAuth } from '@clerk/clerk-react'
import { useEffect, useState } from 'react'
import { AppSidebar } from '#/components/layout/AppSidebar'
import { AppTopbar } from '#/components/layout/AppTopbar'
import { registerClerkTokenGetter } from '#/integrations/clerk/token'

// ssr: false disables server rendering for this route AND every route nested
// under it (dashboard, checklists, gaps, documents, obligations, etc.) — a
// real bug, not a hypothetical: the tRPC client's headers() only reads
// window.Clerk.session.getToken(), which doesn't exist during SSR, so any
// nested route's loader calling an orgProcedure/protectedProcedure endpoint
// was unauthenticated on first load and threw "Sign-in required" (caught by
// Phase 10's new error boundary, which is how this surfaced). Consistent
// with the already-recorded decision to skip the @clerk/tanstack-react-start
// SSR integration — this is the client-side-only guard's other half.
export const Route = createFileRoute('/_authenticated')({
  ssr: false,
  component: AuthenticatedLayout,
})

// Client-side guard only (decision recorded in the plan): Clerk auth state
// isn't reliably available in beforeLoad during SSR without adopting the
// separate @clerk/tanstack-react-start SSR integration, which this project
// hasn't wired up. Every nested route inherits this guard for free instead
// of reimplementing it per-page (as the old dashboard page did).
function AuthenticatedLayout() {
  const { isLoaded, isSignedIn, getToken } = useAuth()
  const navigate = useNavigate()
  // Don't mount data routes until we can attach a Bearer token — otherwise
  // the first tRPC batch races Clerk and comes back 401 "Sign-in required"
  // even though the user is actually signed in (worse on cross-origin
  // Vercel: web and worker are different hosts, so cookies never help).
  const [tokenReady, setTokenReady] = useState(false)

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      void navigate({ to: '/auth/login' })
    }
  }, [isLoaded, isSignedIn, navigate])

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      setTokenReady(false)
      return
    }
    registerClerkTokenGetter(() => getToken())
    let cancelled = false
    void (async () => {
      const start = Date.now()
      while (!cancelled && Date.now() - start < 5000) {
        const token = await getToken()
        if (token) {
          setTokenReady(true)
          return
        }
        await new Promise((r) => setTimeout(r, 50))
      }
      // Fall through: still render; requests may 401, but we tried.
      if (!cancelled) setTokenReady(true)
    })()
    return () => {
      cancelled = true
    }
  }, [isLoaded, isSignedIn, getToken])

  if (!isLoaded || (isSignedIn && !tokenReady)) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>
  }
  if (!isSignedIn) {
    return null
  }

  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      {/* min-w-0 is load-bearing: a flex item defaults to min-width:auto, so
          without it this column refuses to shrink below its content's
          intrinsic width and the whole page scrolls sideways on any route
          with a wide table — the inner overflow-x-auto never gets a chance
          to do its job. */}
      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar />
        <main className="flex-1 px-4 py-6 md:px-8">
          <div className="mx-auto w-full max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
