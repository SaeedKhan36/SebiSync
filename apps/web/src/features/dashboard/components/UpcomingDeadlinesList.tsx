import type { DashboardSummaryData } from '#/features/dashboard/hooks/useDashboardSummary'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { EmptyState } from '#/components/EmptyState'
import { formatDate } from '#/lib/format'

interface UpcomingDeadlinesListProps {
  deadlines: DashboardSummaryData['upcomingDeadlines']
}

export function UpcomingDeadlinesList({ deadlines }: UpcomingDeadlinesListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming deadlines</CardTitle>
      </CardHeader>
      <CardContent>
        {deadlines.length === 0 ? (
          <EmptyState
            title="No upcoming deadlines"
            description="Nothing due in the next 30 days."
          />
        ) : (
          <ul className="divide-y">
            {deadlines.map((item) => (
              <li key={item.id}>
                {/* Not built until Phase 7 — expected 404 for now (plain <a>,
                    not <Link>, since TanStack Router's typed Link only
                    accepts already-registered routes; same pattern as
                    AppSidebar in Phase 3). Proves the navigation wiring
                    ahead of that phase. */}
                <a
                  href={`/checklists/${item.id}`}
                  className="hover:bg-accent flex items-center justify-between rounded-md px-2 py-3"
                >
                  <div>
                    <p className="text-sm font-medium">{item.obligationTitle}</p>
                    <p className="text-muted-foreground text-xs">{item.clientName ?? '—'}</p>
                  </div>
                  <span className="text-muted-foreground text-sm">
                    {formatDate(item.dueDate)}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
