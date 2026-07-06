import { createFileRoute } from '@tanstack/react-router'
import { useOrganization } from '@clerk/clerk-react'
import { PageHeader } from '#/components/layout/PageHeader'

export const Route = createFileRoute('/_authenticated/dashboard/')({ component: DashboardPage })

// Temporary placement/content: this moves under a new _org layout in
// Phase 4 (once the org guard exists) and gets replaced with the real
// dashboard.summary UI in Phase 5.
function DashboardPage() {
  const { organization, isLoaded } = useOrganization()

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" />
      {!isLoaded ? (
        <p>Loading organization...</p>
      ) : !organization ? (
        <p className="text-muted-foreground">
          Select or create an organization above to view its compliance data.
        </p>
      ) : (
        <p>
          Signed in to <strong>{organization.name}</strong>. Checklist/gap/audit views go here
          (see Phase 5+).
        </p>
      )}
    </div>
  )
}
