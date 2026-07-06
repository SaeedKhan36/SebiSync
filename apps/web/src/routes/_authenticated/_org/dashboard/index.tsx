import { createFileRoute } from '@tanstack/react-router'
import { useOrganization } from '@clerk/clerk-react'
import { PageHeader } from '#/components/layout/PageHeader'

export const Route = createFileRoute('/_authenticated/_org/dashboard/')({
  component: DashboardPage,
})

// Temporary content: gets replaced with the real dashboard.summary UI in
// Phase 5. Now correctly nested under the _org layout (Phase 4), which
// guarantees an active + provisioned org by the time this renders.
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
