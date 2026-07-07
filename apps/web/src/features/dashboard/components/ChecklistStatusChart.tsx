import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { DashboardSummaryData } from '#/features/dashboard/hooks/useDashboardSummary'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import {
  checklistStatusChartColorMap,
  checklistStatusColorMap,
} from '#/components/status/statusColorMaps'
import { EmptyState } from '#/components/EmptyState'

interface ChecklistStatusChartProps {
  data: DashboardSummaryData['checklistByStatus']
}

export function ChecklistStatusChart({ data }: ChecklistStatusChartProps) {
  const chartData = data.map((entry) => ({
    name: checklistStatusColorMap[entry.status].label,
    value: entry.count,
    color: checklistStatusChartColorMap[entry.status],
  }))
  const hasData = chartData.some((entry) => entry.value > 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Checklist status</CardTitle>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90}>
                {chartData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState title="No checklist items yet" />
        )}
      </CardContent>
    </Card>
  )
}
