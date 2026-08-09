import { Link } from '@tanstack/react-router'
import type { LinkProps } from '@tanstack/react-router'
import {
  AlertTriangle,
  BookOpenCheck,
  CheckCircle2,
  ListChecks,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { DashboardSummaryData } from '#/features/dashboard/hooks/useDashboardSummary'
import { cn } from '#/lib/utils'

interface SummaryCardsProps {
  summary: DashboardSummaryData
}

function sum(entries: { count: number }[]): number {
  return entries.reduce((total, entry) => total + entry.count, 0)
}

interface StatTile {
  label: string
  value: number
  hint: string
  icon: LucideIcon
  // Icon chip tint — the number itself always stays in ink (text wears text
  // tokens, never the series color).
  chipClass: string
  // Where the tile drills through to. Every stat on this page answers a
  // question the corresponding list page answers in full, so each tile is a
  // pre-filtered entry point rather than a dead number.
  link: LinkProps
}

export function SummaryCards({ summary }: SummaryCardsProps) {
  const totalChecklistItems = sum(summary.checklistByStatus)
  const compliantCount =
    summary.checklistByStatus.find((s) => s.status === 'COMPLIANT')?.count ?? 0
  const openGapsCount = sum(summary.openGapsBySeverity)
  const publishedObligations =
    summary.obligationsByStatus.find((s) => s.status === 'PUBLISHED')?.count ?? 0

  const compliantPct =
    totalChecklistItems > 0 ? Math.round((compliantCount / totalChecklistItems) * 100) : null

  const tiles: StatTile[] = [
    {
      label: 'Checklist items',
      value: totalChecklistItems,
      hint: 'across your client book',
      icon: ListChecks,
      chipClass: 'bg-[#eef2ff] dark:bg-indigo-950/50 text-[#3730a3] dark:text-indigo-300',
      link: { to: '/checklists' },
    },
    {
      label: 'Compliant',
      value: compliantCount,
      hint: compliantPct === null ? 'no items yet' : `${compliantPct}% of all items`,
      icon: CheckCircle2,
      chipClass: 'bg-[#f0fdf4] dark:bg-green-950/40 text-[#15803d] dark:text-green-400',
      link: { to: '/checklists', search: { status: 'COMPLIANT' } },
    },
    {
      label: 'Open gaps',
      value: openGapsCount,
      hint: openGapsCount === 0 ? 'nothing needs attention' : 'needs attention',
      icon: AlertTriangle,
      chipClass:
        openGapsCount === 0 ? 'bg-muted text-muted-foreground' : 'bg-[#fef2f2] dark:bg-red-950/40 text-[#b91c1c] dark:text-red-400',
      // 'unresolved' not `false` — the gaps route models this as a tri-state
      // string enum so it round-trips through the URL.
      link: { to: '/gaps', search: { resolved: 'unresolved' } },
    },
    {
      label: 'Obligations published',
      value: publishedObligations,
      hint: 'live in the register',
      icon: BookOpenCheck,
      chipClass: 'bg-[#eef2ff] dark:bg-indigo-950/50 text-[#3730a3] dark:text-indigo-300',
      link: { to: '/obligations', search: { status: 'PUBLISHED' } },
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {tiles.map((tile) => (
        <Link
          key={tile.label}
          {...tile.link}
          className="rounded-lg border border-border bg-card p-5 shadow-[0_1px_2px_rgba(28,25,23,0.04)] transition-colors transition-shadow hover:border-primary/40 hover:shadow-[0_2px_8px_rgba(28,25,23,0.07)]"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-[13px] font-medium text-muted-foreground">{tile.label}</p>
            <span
              className={cn(
                'flex size-7 shrink-0 items-center justify-center rounded-md',
                tile.chipClass,
              )}
            >
              <tile.icon className="size-4" strokeWidth={2} />
            </span>
          </div>
          <p className="mt-2 text-[32px] leading-none font-semibold tracking-tight text-foreground">
            {tile.value}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">{tile.hint}</p>
        </Link>
      ))}
    </div>
  )
}
