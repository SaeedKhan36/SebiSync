import { Link } from '@tanstack/react-router'
import {
  AlertTriangle,
  FileText,
  Gavel,
  LayoutDashboard,
  ListChecks,
  ScanLine,
  Settings,
} from 'lucide-react'
import { cn } from '#/lib/utils'

// Static nav list. Every item now resolves to a registered route (Dashboard:
// Phase 3, Checklists: Phase 6, Gaps: Phase 8, Documents/Obligations:
// Phase 9, Settings: Phase 11).
const NAV_ITEMS = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { label: 'Checklists', to: '/checklists', icon: ListChecks },
  { label: 'Gaps', to: '/gaps', icon: AlertTriangle },
  { label: 'Documents', to: '/documents', icon: FileText },
  { label: 'Obligations', to: '/obligations', icon: Gavel },
] as const

const SETTINGS_ITEM = {
  label: 'Settings',
  to: '/settings/organization',
  icon: Settings,
} as const

function NavItem({
  label,
  to,
  icon: Icon,
  onNavigate,
}: {
  label: string
  to: (typeof NAV_ITEMS)[number]['to'] | typeof SETTINGS_ITEM.to
  icon: typeof LayoutDashboard
  onNavigate?: () => void
}) {
  return (
    <Link
      to={to}
      onClick={onNavigate}
      className={cn(
        'group relative flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium',
        'text-sidebar-foreground/80 transition-colors',
        'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
        // Active: white card lifted off the paper sidebar, indigo ink, and a
        // short accent bar hugging the left edge.
        'data-[status=active]:bg-white data-[status=active]:text-[#3730a3]',
        'data-[status=active]:shadow-[0_1px_2px_rgba(28,25,23,0.06)]',
        'data-[status=active]:ring-1 data-[status=active]:ring-[#e7e2da]',
      )}
    >
      <span
        aria-hidden
        className="absolute top-1/2 left-0 hidden h-4 w-0.5 -translate-y-1/2 rounded-full bg-[#3730a3] group-data-[status=active]:block"
      />
      <Icon className="size-4 shrink-0" strokeWidth={1.9} />
      {label}
    </Link>
  )
}

// Shared between the desktop <aside> below and AppTopbar's mobile Sheet nav
// (Phase 10) — one nav list, two presentations, so they can never drift.
export function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex flex-1 flex-col p-3">
      <p className="px-3 pt-1 pb-2 text-[11px] font-semibold tracking-[0.12em] text-sidebar-foreground/50 uppercase">
        Workspace
      </p>
      <nav className="space-y-0.5">
        {NAV_ITEMS.map((item) => (
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
      <span className="flex size-7 items-center justify-center rounded-md bg-[#3730a3] text-white">
        <ScanLine className="size-4" strokeWidth={2.2} />
      </span>
      <span className="text-[15px] font-semibold tracking-tight text-foreground">
        RegLens<span className="text-[#3730a3]">·AI</span>
      </span>
    </div>
  )
}

// Desktop only (Phase 10: hidden below md, replaced by AppTopbar's Sheet nav).
export function AppSidebar() {
  return (
    <aside className="bg-sidebar text-sidebar-foreground hidden w-60 shrink-0 flex-col border-r border-sidebar-border md:flex">
      <div className="flex h-14 items-center border-b border-sidebar-border px-4">
        <Brand />
      </div>
      <NavLinks />
    </aside>
  )
}
