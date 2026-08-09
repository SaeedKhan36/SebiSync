import { Link } from '@tanstack/react-router'
import { differenceInCalendarDays } from 'date-fns'
import { ArrowRight, CalendarClock } from 'lucide-react'
import type { DashboardSummaryData } from '#/features/dashboard/hooks/useDashboardSummary'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { EmptyState } from '#/components/EmptyState'
import { cn } from '#/lib/utils'

type Deadline = DashboardSummaryData['upcomingDeadlines'][number]

interface UpcomingDeadlinesListProps {
  deadlines: DashboardSummaryData['upcomingDeadlines']
}

const monthFormatter = new Intl.DateTimeFormat('en-IN', { month: 'short' })

function dueInLabel(days: number): string {
  if (days <= 0) return 'due today'
  if (days === 1) return 'due tomorrow'
  return `in ${days} days`
}

// The server already filters to dueDate >= now, so `days` is never negative
// and there is no overdue bucket to build here.
const URGENT_WITHIN_DAYS = 7

export function UpcomingDeadlinesList({ deadlines }: UpcomingDeadlinesListProps) {
  const now = new Date()
  const daysUntil = (item: Deadline) =>
    differenceInCalendarDays(new Date(item.dueDate), now)

  const thisWeek = deadlines.filter((item) => daysUntil(item) <= URGENT_WITHIN_DAYS)
  const later = deadlines.filter((item) => daysUntil(item) > URGENT_WITHIN_DAYS)

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle className="text-[15px] font-semibold">Upcoming deadlines</CardTitle>
        <CardAction>
          <Link
            to="/checklists"
            className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            View all
            <ArrowRight className="size-3.5" />
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent>
        {deadlines.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="No upcoming deadlines"
            description="Nothing due in the next 30 days."
          />
        ) : (
          <div className="space-y-4">
            <DeadlineGroup label="This week" items={thisWeek} now={now} />
            <DeadlineGroup label="Later this month" items={later} now={now} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function DeadlineGroup({
  label,
  items,
  now,
}: {
  label: string
  items: Deadline[]
  now: Date
}) {
  if (items.length === 0) return null

  return (
    <div>
      <p className="mb-1 px-1 text-[11px] font-medium tracking-[0.06em] text-muted-foreground uppercase">
        {label}
      </p>
      <ul className="divide-y divide-border">
        {items.map((item) => {
          const due = new Date(item.dueDate)
          const days = differenceInCalendarDays(due, now)
          const urgent = days <= URGENT_WITHIN_DAYS
          return (
            <li key={item.id}>
              <Link
                to="/checklists/$checklistItemId"
                params={{ checklistItemId: item.id }}
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
                  <span className="block truncate text-sm font-medium text-foreground group-hover:text-primary">
                    {item.obligationTitle}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {item.clientName ?? 'Organisation-wide'}
                  </span>
                </span>
                <span
                  className={cn(
                    'shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium',
                    urgent ? 'bg-[#fef2f2] dark:bg-red-950/40 text-[#b91c1c] dark:text-red-400' : 'bg-muted text-muted-foreground',
                  )}
                >
                  {dueInLabel(days)}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
