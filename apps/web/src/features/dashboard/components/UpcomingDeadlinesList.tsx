import { differenceInCalendarDays } from 'date-fns'
import { CalendarClock } from 'lucide-react'
import type { DashboardSummaryData } from '#/features/dashboard/hooks/useDashboardSummary'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { EmptyState } from '#/components/EmptyState'
import { cn } from '#/lib/utils'

interface UpcomingDeadlinesListProps {
  deadlines: DashboardSummaryData['upcomingDeadlines']
}

const monthFormatter = new Intl.DateTimeFormat('en-IN', { month: 'short' })

function dueInLabel(days: number): string {
  if (days <= 0) return 'due today'
  if (days === 1) return 'due tomorrow'
  return `in ${days} days`
}

export function UpcomingDeadlinesList({ deadlines }: UpcomingDeadlinesListProps) {
  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle className="text-[15px] font-semibold">Upcoming deadlines</CardTitle>
      </CardHeader>
      <CardContent>
        {deadlines.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="No upcoming deadlines"
            description="Nothing due in the next 30 days."
          />
        ) : (
          <ul className="divide-y divide-border">
            {deadlines.map((item) => {
              const due = new Date(item.dueDate)
              const days = differenceInCalendarDays(due, new Date())
              const urgent = days <= 7
              return (
                <li key={item.id}>
                  {/* Plain <a>: checklist detail route registered in Phase 7;
                      kept as-is per the original wiring note. */}
                  <a
                    href={`/checklists/${item.id}`}
                    className="group flex items-center gap-4 px-1 py-3 transition-colors hover:bg-accent/60"
                  >
                    {/* Mini calendar date chip */}
                    <span className="flex w-11 shrink-0 flex-col items-center rounded-md border border-border bg-background py-1">
                      <span className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                        {monthFormatter.format(due)}
                      </span>
                      <span className="text-base leading-tight font-semibold text-foreground tabular-nums">
                        {due.getDate()}
                      </span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground group-hover:text-[#3730a3]">
                        {item.obligationTitle}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {item.clientName ?? 'Organisation-wide'}
                      </span>
                    </span>
                    <span
                      className={cn(
                        'shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium',
                        urgent
                          ? 'bg-[#fef2f2] text-[#b91c1c]'
                          : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {dueInLabel(days)}
                    </span>
                  </a>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
