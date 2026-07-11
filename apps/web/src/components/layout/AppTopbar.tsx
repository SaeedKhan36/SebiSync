import { useState } from 'react'
import { Menu } from 'lucide-react'
import { OrganizationSwitcher, UserButton } from '@clerk/clerk-react'
import { Button } from '#/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '#/components/ui/sheet'
import { Brand, NavLinks } from '#/components/layout/AppSidebar'

// Permanent home for OrganizationSwitcher/UserButton — moved here from the
// old dashboard page, which owned them ad hoc before this shell existed.
// Phase 10: gained a mobile-only hamburger that opens the nav (AppSidebar's
// NavLinks, reused) inside a Sheet, since the sidebar itself is now hidden
// below the md breakpoint.
export function AppTopbar() {
  const [navOpen, setNavOpen] = useState(false)

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/85 px-4 backdrop-blur-sm md:px-8">
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
        <SheetContent side="left" className="w-64 bg-sidebar p-0">
          <SheetHeader className="border-b border-sidebar-border px-4 py-0">
            <SheetTitle className="flex h-14 items-center">
              <Brand />
            </SheetTitle>
          </SheetHeader>
          <NavLinks onNavigate={() => setNavOpen(false)} />
        </SheetContent>
      </Sheet>
      <div className="hidden md:block" />
      <div className="flex items-center gap-3">
        <OrganizationSwitcher
          afterSelectOrganizationUrl="/dashboard"
          afterCreateOrganizationUrl="/dashboard"
          hidePersonal
        />
        <span aria-hidden className="h-5 w-px bg-border" />
        <UserButton />
      </div>
    </header>
  )
}
