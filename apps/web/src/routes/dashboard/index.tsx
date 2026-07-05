import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { OrganizationSwitcher, UserButton, useAuth, useOrganization } from '@clerk/clerk-react'
import { useEffect } from 'react'

export const Route = createFileRoute('/dashboard/')({ component: DashboardPage })

function DashboardPage() {
  const { isLoaded, isSignedIn } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      void navigate({ to: '/auth/login' })
    }
  }, [isLoaded, isSignedIn, navigate])

  if (!isLoaded) return <p className="p-8">Loading...</p>
  if (!isSignedIn) return null

  return <DashboardShell />
}

function DashboardShell() {
  const { organization, isLoaded } = useOrganization()

  return (
    <div className="p-8">
      <header className="flex items-center justify-between border-b pb-4">
        <h1 className="text-2xl font-bold">SEBI Compliance Dashboard</h1>
        <div className="flex items-center gap-4">
          <OrganizationSwitcher
            afterSelectOrganizationUrl="/dashboard"
            afterCreateOrganizationUrl="/dashboard"
            hidePersonal
          />
          <UserButton />
        </div>
      </header>

      <main className="mt-6">
        {!isLoaded ? (
          <p>Loading organization...</p>
        ) : !organization ? (
          <p className="text-muted-foreground">
            Select or create an organization above to view its compliance data.
          </p>
        ) : (
          <p>
            Signed in to <strong>{organization.name}</strong>. Checklist/gap/audit views go here
            (see task #8).
          </p>
        )}
      </main>
    </div>
  )
}
