import { Link } from '@tanstack/react-router'
import { AlertTriangle, FileText, Gavel, LayoutDashboard, ListChecks, Settings } from 'lucide-react'
import { cn } from '#/lib/utils'

// Static nav list. Only Dashboard resolves to a route that exists yet
// (Phase 3) — the rest intentionally point at their planned future paths
// and will 404 until their own phases build them (Checklists: Phase 6,
// Gaps: Phase 8, Documents/Obligations: Phase 9, Settings: Phase 4/9).
// No "requires org" disabled state here — that's Phase 4's concern once
// the org guard exists to check against.
const NAV_ITEMS = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { label: 'Checklists', to: '/checklists', icon: ListChecks },
  { label: 'Gaps', to: '/gaps', icon: AlertTriangle },
  { label: 'Documents', to: '/documents', icon: FileText },
  { label: 'Obligations', to: '/obligations', icon: Gavel },
  { label: 'Settings', to: '/settings/organization', icon: Settings },
] as const

export function AppSidebar() {
  return (
    <aside className="bg-sidebar text-sidebar-foreground flex w-56 shrink-0 flex-col border-r">
      <div className="flex h-14 items-center border-b px-4 font-semibold">RegLens-AI</div>
      <nav className="flex-1 space-y-1 p-2">
        {NAV_ITEMS.map(({ label, to, icon: Icon }) => {
          const linkClassName = cn(
            'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium',
            'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
            'data-[status=active]:bg-sidebar-accent data-[status=active]:text-sidebar-accent-foreground',
          )
          // Only /dashboard is a registered route so far — the rest are
          // plain anchors to their planned future paths (will 404 until
          // their own phases build them; TanStack Router's typed `Link`
          // only accepts already-registered routes).
          if (to === '/dashboard') {
            return (
              <Link key={to} to={to} className={linkClassName}>
                <Icon className="size-4" />
                {label}
              </Link>
            )
          }
          return (
            <a key={to} href={to} className={linkClassName}>
              <Icon className="size-4" />
              {label}
            </a>
          )
        })}
      </nav>
    </aside>
  )
}
