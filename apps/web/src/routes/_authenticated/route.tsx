import { createFileRoute, Outlet, useNavigate } from '@tanstack/react-router'
import { useAuth } from '@clerk/clerk-react'
import { useEffect } from 'react'
import { AppSidebar } from '#/components/layout/AppSidebar'
import { AppTopbar } from '#/components/layout/AppTopbar'

export const Route = createFileRoute('/_authenticated')({ component: AuthenticatedLayout })

// Client-side guard only (decision recorded in the plan): Clerk auth state
// isn't reliably available in beforeLoad during SSR without adopting the
// separate @clerk/tanstack-react-start SSR integration, which this project
// hasn't wired up. Every nested route inherits this guard for free instead
// of reimplementing it per-page (as the old dashboard page did).
function AuthenticatedLayout() {
  const { isLoaded, isSignedIn } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      void navigate({ to: '/auth/login' })
    }
  }, [isLoaded, isSignedIn, navigate])

  if (!isLoaded) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>
  }
  if (!isSignedIn) {
    return null
  }

  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <div className="flex flex-1 flex-col">
        <AppTopbar />
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
