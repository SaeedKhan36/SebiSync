import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { DashboardSummaryData } from '#/features/dashboard/hooks/useDashboardSummary'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { gapSeverityChartColorMap, gapSeverityColorMap } from '#/components/status/statusColorMaps'
import { EmptyState } from '#/components/EmptyState'

interface GapSeverityChartProps {
  data: DashboardSummaryData['openGapsBySeverity']
}

export function GapSeverityChart({ data }: GapSeverityChartProps) {
  const chartData = data.map((entry) => ({
    name: gapSeverityColorMap[entry.severity].label,
    value: entry.count,
    color: gapSeverityChartColorMap[entry.severity],
  }))
  const hasData = chartData.some((entry) => entry.value > 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Open gaps by severity</CardTitle>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData}>
              <XAxis dataKey="name" fontSize={12} />
              <YAxis allowDecimals={false} fontSize={12} />
              <Tooltip />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {chartData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState title="No open gaps" description="Nothing needs attention right now." />
        )}
      </CardContent>
    </Card>
  )
}
