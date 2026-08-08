import { createFileRoute, Outlet, useLocation, useNavigate } from '@tanstack/react-router'
import { useOrganization } from '@clerk/clerk-react'
import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useTRPC } from '#/integrations/trpc/react'
import { RequireOrg } from '#/components/RequireOrg'

export const Route = createFileRoute('/_authenticated/_org')({ component: OrgLayout })

const ONBOARDING_PATH = '/onboarding'

// Two distinct failure modes, per the plan: "no Clerk org active at all"
// (Clerk already knows this client-side, no server round-trip needed) vs.
// "org active but not yet provisioned as an Intermediary" (only the server
// can answer this — reuses client.listByIntermediary, a trivial orgProcedure
// query already built in Phase 1, rather than adding a dedicated endpoint).
function OrgLayout() {
  const { organization, isLoaded: orgLoaded } = useOrganization()
  const trpc = useTRPC()
  const location = useLocation()
  const navigate = useNavigate()
  const isOnboardingRoute = location.pathname === ONBOARDING_PATH

  const provisionCheck = useQuery({
    ...trpc.client.listByIntermediary.queryOptions(),
    enabled: orgLoaded && !!organization,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes - prevent excessive refetching
    gcTime: 10 * 60 * 1000, // 10 minutes
  })

  const isProvisioned = provisionCheck.isSuccess
  const isForbidden =
    provisionCheck.isError &&
    (provisionCheck.error as { data?: { code?: string } }).data?.code === 'FORBIDDEN'

  useEffect(() => {
    if (isForbidden && !isOnboardingRoute) {
      void navigate({ to: ONBOARDING_PATH })
    } else if (isProvisioned && isOnboardingRoute) {
      void navigate({ to: '/dashboard' })
    }
  }, [isForbidden, isProvisioned, isOnboardingRoute])

  if (!orgLoaded) {
    return <div className="flex min-h-[50vh] items-center justify-center">Loading...</div>
  }

  if (!organization) {
    return <RequireOrg />
  }

  // Onboarding itself must stay reachable even though the check below it
  // would otherwise gate everything under this layout.
  if (isOnboardingRoute) {
    return <Outlet />
  }

  if (provisionCheck.isPending) {
    return <div className="flex min-h-[50vh] items-center justify-center">Loading...</div>
  }

  if (isForbidden) {
    // Redirect fires in the effect above; render nothing in the meantime.
    return null
  }

  return <Outlet />
}
