import type { DashboardSummaryData } from '#/features/dashboard/hooks/useDashboardSummary'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'

interface SummaryCardsProps {
  summary: DashboardSummaryData
}

function sum(entries: { count: number }[]): number {
  return entries.reduce((total, entry) => total + entry.count, 0)
}

export function SummaryCards({ summary }: SummaryCardsProps) {
  const totalChecklistItems = sum(summary.checklistByStatus)
  const compliantCount =
    summary.checklistByStatus.find((s) => s.status === 'COMPLIANT')?.count ?? 0
  const openGapsCount = sum(summary.openGapsBySeverity)
  const publishedObligations =
    summary.obligationsByStatus.find((s) => s.status === 'PUBLISHED')?.count ?? 0

  const cards = [
    { label: 'Checklist items', value: totalChecklistItems },
    { label: 'Compliant', value: compliantCount },
    { label: 'Open gaps', value: openGapsCount },
    { label: 'Obligations published', value: publishedObligations },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardHeader>
            <CardTitle className="text-muted-foreground text-sm font-normal">
              {card.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{card.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
