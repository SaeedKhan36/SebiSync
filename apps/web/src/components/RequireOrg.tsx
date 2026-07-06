import { OrganizationSwitcher } from '@clerk/clerk-react'
import { EmptyState } from '#/components/EmptyState'
import { Building2 } from 'lucide-react'

// Rendered by the _org layout only for the "no Clerk org active at all"
// case. The "org active but not provisioned" case has no UI of its own —
// it's a transient routing decision that redirects to /onboarding instead
// (see routes/_authenticated/_org/route.tsx).
export function RequireOrg() {
  return (
    <EmptyState
      icon={Building2}
      title="Select or create an organization"
      description="Choose an organization from the switcher below to view its compliance data, or create a new one."
      action={<OrganizationSwitcher hidePersonal />}
    />
  )
}
