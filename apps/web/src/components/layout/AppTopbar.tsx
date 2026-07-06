import { OrganizationSwitcher, UserButton } from '@clerk/clerk-react'

// Permanent home for OrganizationSwitcher/UserButton — moved here from the
// old dashboard page, which owned them ad hoc before this shell existed.
export function AppTopbar() {
  return (
    <header className="flex h-14 items-center justify-between border-b px-6">
      <div />
      <div className="flex items-center gap-4">
        <OrganizationSwitcher
          afterSelectOrganizationUrl="/dashboard"
          afterCreateOrganizationUrl="/dashboard"
          hidePersonal
        />
        <UserButton />
      </div>
    </header>
  )
}
