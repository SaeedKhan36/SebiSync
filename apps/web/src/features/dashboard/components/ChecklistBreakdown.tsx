import { Link } from '@tanstack/react-router'
import type { DashboardSummaryData } from '#/features/dashboard/hooks/useDashboardSummary'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import {
  checklistStatusChartColorMap,
  checklistStatusColorMap,
} from '#/components/status/statusColorMaps'
import { EmptyState } from '#/components/EmptyState'
import type { ChecklistStatus } from '@sebi/schemas'

interface ChecklistBreakdownProps {
  data: DashboardSummaryData['checklistByStatus']
}

// Fixed render order — carried over from the donut this replaced. Keeps the
// green (Compliant) and red (Gap) segments non-adjacent for CVD safety; the
// neutral N/A segment terminates the bar.
const STATUS_ORDER: ChecklistStatus[] = [
  'COMPLIANT',
  'IN_PROGRESS',
  'PENDING',
  'GAP',
  'NOT_APPLICABLE',
]

export function ChecklistBreakdown({ data }: ChecklistBreakdownProps) {
  const byStatus = new Map(data.map((entry) => [entry.status, entry.count]))
  const rows = STATUS_ORDER.map((status) => ({
    status,
    label: checklistStatusColorMap[status].label,
    color: checklistStatusChartColorMap[status],
    value: byStatus.get(status) ?? 0,
  })).filter((row) => row.value > 0)

  const total = rows.reduce((acc, row) => acc + row.value, 0)
  const compliant = byStatus.get('COMPLIANT') ?? 0
  // Guarded rather than computed unconditionally — an org with no checklist
  // items yet is "unknown", not "0% compliant".
  const compliantPct = total > 0 ? Math.round((compliant / total) * 100) : null

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle className="text-[15px] font-semibold">Checklist breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <EmptyState title="No checklist items yet" />
        ) : (
          <div className="space-y-4">
            <div className="flex items-baseline gap-2">
              <span className="text-[32px] leading-none font-semibold tracking-tight text-foreground tabular-nums">
                {compliantPct === null ? '—' : `${compliantPct}%`}
              </span>
              <span className="text-sm text-muted-foreground">
                {compliant} of {total} item{total === 1 ? '' : 's'} compliant
              </span>
            </div>

            {/* Segmented proportional bar — reads correctly at any N, unlike
                the donut it replaced, which drew a 210px ring around "1". */}
            <div
              className="flex h-2.5 w-full gap-px overflow-hidden rounded-full bg-muted"
              role="img"
              aria-label={rows.map((row) => `${row.label}: ${row.value}`).join(', ')}
            >
              {rows.map((row) => (
                <div
                  key={row.status}
                  style={{
                    width: `${(row.value / total) * 100}%`,
                    backgroundColor: row.color,
                  }}
                />
              ))}
            </div>

            {/* Identity never rides on color alone — every segment gets a
                labeled row, and the row is the drill-through to its filter. */}
            <ul className="-mx-2 space-y-0.5">
              {rows.map((row) => (
                <li key={row.status}>
                  <Link
                    to="/checklists"
                    search={{ status: row.status }}
                    className="flex items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-accent/50"
                  >
                    <span
                      aria-hidden
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: row.color }}
                    />
                    <span className="flex-1 truncate text-sm text-foreground">{row.label}</span>
                    <span className="text-sm font-semibold text-foreground tabular-nums">
                      {row.value}
                    </span>
                    <span className="w-10 text-right text-xs text-muted-foreground tabular-nums">
                      {Math.round((row.value / total) * 100)}%
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
