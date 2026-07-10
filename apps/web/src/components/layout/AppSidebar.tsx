import { Link } from '@tanstack/react-router'
import { AlertTriangle, FileText, Gavel, LayoutDashboard, ListChecks, Settings } from 'lucide-react'
import { cn } from '#/lib/utils'

// Static nav list. Every item except Settings now resolves to a registered
// route (Dashboard: Phase 3, Checklists: Phase 6, Gaps: Phase 8,
// Documents/Obligations: Phase 9) — Settings still points at its planned
// future path and will 404 until it's built.
const NAV_ITEMS = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard, registered: true },
  { label: 'Checklists', to: '/checklists', icon: ListChecks, registered: true },
  { label: 'Gaps', to: '/gaps', icon: AlertTriangle, registered: true },
  { label: 'Documents', to: '/documents', icon: FileText, registered: true },
  { label: 'Obligations', to: '/obligations', icon: Gavel, registered: true },
  { label: 'Settings', to: '/settings/organization', icon: Settings, registered: false },
] as const

// Shared between the desktop <aside> below and AppTopbar's mobile Sheet nav
// (Phase 10) — one nav list, two presentations, so they can never drift.
export function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex-1 space-y-1 p-2">
      {NAV_ITEMS.map(({ label, to, icon: Icon, registered }) => {
        const linkClassName = cn(
          'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium',
          'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
          'data-[status=active]:bg-sidebar-accent data-[status=active]:text-sidebar-accent-foreground',
        )
        // TanStack Router's typed `Link` only accepts already-registered
        // routes — Settings stays a plain anchor until it's built.
        if (registered) {
          return (
            <Link key={to} to={to} className={linkClassName} onClick={onNavigate}>
              <Icon className="size-4" />
              {label}
            </Link>
          )
        }
        return (
          <a key={to} href={to} className={linkClassName} onClick={onNavigate}>
            <Icon className="size-4" />
            {label}
          </a>
        )
      })}
    </nav>
  )
}

// Desktop only (Phase 10: hidden below md, replaced by AppTopbar's Sheet nav).
export function AppSidebar() {
  return (
    <aside className="bg-sidebar text-sidebar-foreground hidden w-56 shrink-0 flex-col border-r md:flex">
      <div className="flex h-14 items-center border-b px-4 font-semibold">RegLens-AI</div>
      <NavLinks />
    </aside>
  )
}
