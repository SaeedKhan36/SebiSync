import { Link } from '@tanstack/react-router'
import { CheckCircle2 } from 'lucide-react'
import type { DashboardSummaryData } from '#/features/dashboard/hooks/useDashboardSummary'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { gapSeverityChartColorMap, gapSeverityColorMap } from '#/components/status/statusColorMaps'
import type { GapSeverity } from '@sebi/schemas'

interface GapSeverityBreakdownProps {
  data: DashboardSummaryData['openGapsBySeverity']
}

// Most urgent first — this card's job is triage, not axis reading, so it
// inverts the ordinal Low→Critical axis the bar chart it replaced used.
const SEVERITY_ORDER: GapSeverity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']

export function GapSeverityBreakdown({ data }: GapSeverityBreakdownProps) {
  const bySeverity = new Map(data.map((entry) => [entry.severity, entry.count]))
  const rows = SEVERITY_ORDER.map((severity) => ({
    severity,
    label: gapSeverityColorMap[severity].label,
    color: gapSeverityChartColorMap[severity],
    value: bySeverity.get(severity) ?? 0,
  }))

  const max = Math.max(...rows.map((row) => row.value))
  const total = rows.reduce((acc, row) => acc + row.value, 0)

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle className="text-[15px] font-semibold">Needs attention</CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          // A calm one-liner, not a 200px dashed box — "nothing is wrong" is
          // good news and shouldn't occupy the page like a missing feature.
          <div className="flex items-center gap-2.5 py-3">
            <CheckCircle2 className="size-5 shrink-0 text-[#15803d]" strokeWidth={2} />
            <div>
              <p className="text-sm font-medium text-foreground">All clear</p>
              <p className="text-xs text-muted-foreground">No open gaps across your checklists.</p>
            </div>
          </div>
        ) : (
          // Zero rows stay rendered but dimmed: the fixed four-row shape keeps
          // this card the same height as its neighbour in the grid.
          <ul className="-mx-2 space-y-0.5">
            {rows.map((row) => (
              <li key={row.severity}>
                <Link
                  to="/gaps"
                  search={{ severity: row.severity, resolved: 'unresolved' }}
                  className="flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-accent/50"
                >
                  <span
                    className={
                      row.value === 0
                        ? 'w-16 shrink-0 text-sm text-muted-foreground'
                        : 'w-16 shrink-0 text-sm font-medium text-foreground'
                    }
                  >
                    {row.label}
                  </span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    {row.value > 0 && (
                      <span
                        className="block h-full rounded-full"
                        style={{
                          width: `${(row.value / max) * 100}%`,
                          backgroundColor: row.color,
                        }}
                      />
                    )}
                  </span>
                  <span
                    className={
                      row.value === 0
                        ? 'w-6 shrink-0 text-right text-sm text-muted-foreground tabular-nums'
                        : 'w-6 shrink-0 text-right text-sm font-semibold text-foreground tabular-nums'
                    }
                  >
                    {row.value}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
