import { Link, useRouterState } from '@tanstack/react-router'
import {
  AlertTriangle,
  FileText,
  Gavel,
  LayoutDashboard,
  ListChecks,
  ScanLine,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { cn } from '#/lib/utils'
import { useIsOrgAdmin } from '#/features/auth/hooks/useIsOrgAdmin'

// Static nav list. Every item now resolves to a registered route (Dashboard:
// Phase 3, Checklists: Phase 6, Gaps: Phase 8, Documents/Obligations:
// Phase 9, Settings: Phase 11).
const NAV_ITEMS = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { label: 'Checklists', to: '/checklists', icon: ListChecks, excludePrefix: '/checklists/review' },
  { label: 'Gaps', to: '/gaps', icon: AlertTriangle },
  { label: 'Clients', to: '/clients', icon: Users },
  { label: 'Documents', to: '/documents', icon: FileText },
  { label: 'Obligations', to: '/obligations', icon: Gavel },
] as const

const REVIEW_ITEM = {
  label: 'Review',
  to: '/checklists/review',
  icon: ShieldCheck,
} as const

// Settings spans several sibling pages (/settings/intermediary,
// /settings/organization), so it matches on the section prefix rather than on
// the one URL it links to — otherwise the entry unhighlights the moment you
// switch tabs inside Settings.
const SETTINGS_ITEM = {
  label: 'Settings',
  to: '/settings/intermediary',
  icon: Settings,
  matchPrefix: '/settings',
} as const

function NavItem({
  label,
  to,
  icon: Icon,
  onNavigate,
  matchPrefix,
  excludePrefix,
}: {
  label: string
  to: (typeof NAV_ITEMS)[number]['to'] | typeof SETTINGS_ITEM.to | typeof REVIEW_ITEM.to
  icon: typeof LayoutDashboard
  onNavigate?: () => void
  matchPrefix?: string
  excludePrefix?: string
}) {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  // Prefix match so detail routes (/gaps/$gapId) keep their section lit.
  const prefix = matchPrefix ?? to
  const matchesPrefix = pathname === prefix || pathname.startsWith(`${prefix}/`)
  const excluded = excludePrefix
    ? pathname === excludePrefix || pathname.startsWith(`${excludePrefix}/`)
    : false
  const isActive = matchesPrefix && !excluded

  return (
    <Link
      to={to}
      onClick={onNavigate}
      className={cn(
        'group relative flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium',
        'text-sidebar-foreground/80 transition-colors',
        'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
        // Active: card lifted off the paper sidebar, primary ink, and a
        // short accent bar hugging the left edge.
        isActive &&
          'bg-card text-primary shadow-[0_1px_2px_rgba(28,25,23,0.06)] ring-1 ring-border',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'absolute top-1/2 left-0 h-4 w-0.5 -translate-y-1/2 rounded-full bg-primary',
          isActive ? 'block' : 'hidden',
        )}
      />
      <Icon className="size-4 shrink-0" strokeWidth={1.9} />
      {label}
    </Link>
  )
}

// Shared between the desktop <aside> below and AppTopbar's mobile Sheet nav
// (Phase 10) — one nav list, two presentations, so they can never drift.
export function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const isAdmin = useIsOrgAdmin()
  const items = isAdmin
    ? [NAV_ITEMS[0], NAV_ITEMS[1], REVIEW_ITEM, ...NAV_ITEMS.slice(2)]
    : NAV_ITEMS

  return (
    <div className="flex flex-1 flex-col p-3">
      <p className="px-3 pt-1 pb-2 text-[11px] font-semibold tracking-[0.12em] text-sidebar-foreground/50 uppercase">
        Workspace
      </p>
      <nav className="space-y-0.5">
        {items.map((item) => (
          <NavItem key={item.to} {...item} onNavigate={onNavigate} />
        ))}
      </nav>
      <div className="mt-auto border-t border-sidebar-border pt-3">
        <NavItem {...SETTINGS_ITEM} onNavigate={onNavigate} />
      </div>
    </div>
  )
}

export function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <ScanLine className="size-4" strokeWidth={2.2} />
      </span>
      <span className="text-[15px] font-semibold tracking-tight text-foreground">
        SEBISync<span className="text-primary">·AI</span>
      </span>
    </div>
  )
}

// Desktop only (Phase 10: hidden below md, replaced by AppTopbar's Sheet nav).
export function AppSidebar() {
  return (
    <aside className="bg-sidebar text-sidebar-foreground sticky top-0 hidden h-screen w-60 shrink-0 flex-col overflow-y-auto border-r border-sidebar-border md:flex">
      <div className="flex h-14 items-center border-b border-sidebar-border px-4">
        <Brand />
      </div>
      <NavLinks />
    </aside>
  )
}
