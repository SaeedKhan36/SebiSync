import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { DashboardSummaryData } from '#/features/dashboard/hooks/useDashboardSummary'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import {
  checklistStatusChartColorMap,
  checklistStatusColorMap,
} from '#/components/status/statusColorMaps'
import { EmptyState } from '#/components/EmptyState'
import type { ChecklistStatus } from '@sebi/schemas'

interface ChecklistStatusChartProps {
  data: DashboardSummaryData['checklistByStatus']
}

// Fixed render order — keeps the green (Compliant) and red (Gap) slices
// non-adjacent for CVD safety; the neutral N/A slice sits between red and
// the wrap back to green.
const STATUS_ORDER: ChecklistStatus[] = [
  'COMPLIANT',
  'IN_PROGRESS',
  'PENDING',
  'GAP',
  'NOT_APPLICABLE',
]

export function ChecklistStatusChart({ data }: ChecklistStatusChartProps) {
  const byStatus = new Map(data.map((entry) => [entry.status, entry.count]))
  const chartData = STATUS_ORDER.map((status) => ({
    name: checklistStatusColorMap[status].label,
    value: byStatus.get(status) ?? 0,
    color: checklistStatusChartColorMap[status],
  })).filter((entry) => entry.value > 0)

  const total = chartData.reduce((acc, entry) => acc + entry.value, 0)
  const hasData = total > 0

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle className="text-[15px] font-semibold">Checklist status</CardTitle>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <div className="flex flex-col items-center gap-5">
            {/* Donut with a center hero figure; 2px card-surface spacers
                between slices per the mark spec. */}
            <div className="relative h-[210px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={66}
                    outerRadius={92}
                    stroke="var(--card)"
                    strokeWidth={2}
                    isAnimationActive={false}
                  >
                    {chartData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    cursor={false}
                    contentStyle={{
                      background: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      fontSize: 12,
                      color: 'var(--foreground)',
                      boxShadow: '0 4px 12px rgba(28,25,23,0.08)',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-semibold tracking-tight text-foreground">
                  {total}
                </span>
                <span className="text-xs text-muted-foreground">
                  item{total === 1 ? '' : 's'}
                </span>
              </div>
            </div>
            {/* Labeled legend with counts — identity is never color-alone. */}
            <ul className="flex flex-wrap justify-center gap-x-5 gap-y-1.5">
              {chartData.map((entry) => (
                <li key={entry.name} className="flex items-center gap-1.5 text-xs">
                  <span
                    aria-hidden
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-muted-foreground">{entry.name}</span>
                  <span className="font-semibold text-foreground tabular-nums">
                    {entry.value}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <EmptyState title="No checklist items yet" />
        )}
      </CardContent>
    </Card>
  )
}
