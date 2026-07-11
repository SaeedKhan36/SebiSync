import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { DashboardSummaryData } from '#/features/dashboard/hooks/useDashboardSummary'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { gapSeverityChartColorMap, gapSeverityColorMap } from '#/components/status/statusColorMaps'
import { EmptyState } from '#/components/EmptyState'
import type { GapSeverity } from '@sebi/schemas'

interface GapSeverityChartProps {
  data: DashboardSummaryData['openGapsBySeverity']
}

// Fixed ordinal order — severity is ordered magnitude, so the axis always
// reads Low → Critical regardless of which buckets have data.
const SEVERITY_ORDER: GapSeverity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']

export function GapSeverityChart({ data }: GapSeverityChartProps) {
  const bySeverity = new Map(data.map((entry) => [entry.severity, entry.count]))
  const chartData = SEVERITY_ORDER.map((severity) => ({
    name: gapSeverityColorMap[severity].label,
    value: bySeverity.get(severity) ?? 0,
    color: gapSeverityChartColorMap[severity],
  }))
  const hasData = chartData.some((entry) => entry.value > 0)

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle className="text-[15px] font-semibold">Open gaps by severity</CardTitle>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} margin={{ top: 20, right: 4, left: -22, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="0" />
              <XAxis
                dataKey="name"
                fontSize={12}
                tickLine={false}
                axisLine={{ stroke: 'var(--border)' }}
                tick={{ fill: 'var(--muted-foreground)' }}
              />
              <YAxis
                allowDecimals={false}
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tick={{ fill: 'var(--muted-foreground)' }}
              />
              <Tooltip
                cursor={{ fill: 'var(--accent)', opacity: 0.5 }}
                contentStyle={{
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  fontSize: 12,
                  color: 'var(--foreground)',
                  boxShadow: '0 4px 12px rgba(28,25,23,0.08)',
                }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={44} isAnimationActive={false}>
                {/* Direct value labels — the relief channel for the lighter
                    ramp steps, so magnitude never rides on color alone. */}
                <LabelList
                  dataKey="value"
                  position="top"
                  style={{
                    fill: 'var(--muted-foreground)',
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                />
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
