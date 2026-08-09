import { Link } from '@tanstack/react-router'
import { cn } from '#/lib/utils'

// Settings is split across two pages because they answer different questions
// and come from different systems: "who are we with SEBI" (our own DB) vs.
// "who can sign in here" (Clerk). Clerk's <OrganizationProfile /> is a
// full-width surface with its own nav, so it can't share a row with anything.
const SETTINGS_TABS = [
  { label: 'Intermediary', to: '/settings/intermediary' },
  { label: 'Organisation', to: '/settings/organization' },
] as const

export function SettingsTabs() {
  return (
    <nav
      aria-label="Settings sections"
      className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-1"
    >
      {SETTINGS_TABS.map((tab) => (
        <Link
          key={tab.to}
          to={tab.to}
          className={cn(
            'rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors',
            'hover:text-foreground',
            // Same "lifted card" active language as the sidebar.
            'data-[status=active]:bg-card data-[status=active]:text-foreground',
            'data-[status=active]:shadow-[0_1px_2px_rgba(28,25,23,0.06)]',
            'data-[status=active]:ring-1 data-[status=active]:ring-border',
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  )
}
