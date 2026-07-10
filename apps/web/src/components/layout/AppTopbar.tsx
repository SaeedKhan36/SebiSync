import { useState } from 'react'
import { Menu } from 'lucide-react'
import { OrganizationSwitcher, UserButton } from '@clerk/clerk-react'
import { Button } from '#/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '#/components/ui/sheet'
import { NavLinks } from '#/components/layout/AppSidebar'

// Permanent home for OrganizationSwitcher/UserButton — moved here from the
// old dashboard page, which owned them ad hoc before this shell existed.
// Phase 10: gained a mobile-only hamburger that opens the nav (AppSidebar's
// NavLinks, reused) inside a Sheet, since the sidebar itself is now hidden
// below the md breakpoint.
export function AppTopbar() {
  const [navOpen, setNavOpen] = useState(false)

  return (
    <header className="flex h-14 items-center justify-between border-b px-4 md:px-6">
      <Sheet open={navOpen} onOpenChange={setNavOpen}>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setNavOpen(true)}
          aria-label="Open navigation menu"
        >
          <Menu className="size-5" />
        </Button>
        <SheetContent side="left" className="w-64 p-0">
          <SheetHeader className="border-b px-4 py-0">
            <SheetTitle className="flex h-14 items-center font-semibold">RegLens-AI</SheetTitle>
          </SheetHeader>
          <NavLinks onNavigate={() => setNavOpen(false)} />
        </SheetContent>
      </Sheet>
      <div className="hidden md:block" />
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
