import { createFileRoute } from '@tanstack/react-router'
import { PageHeader } from '#/components/layout/PageHeader'
import { Skeleton } from '#/components/ui/skeleton'
import { useDashboardSummary } from '#/features/dashboard/hooks/useDashboardSummary'
import { SummaryCards } from '#/features/dashboard/components/SummaryCards'
import { ChecklistStatusChart } from '#/features/dashboard/components/ChecklistStatusChart'
import { GapSeverityChart } from '#/features/dashboard/components/GapSeverityChart'
import { UpcomingDeadlinesList } from '#/features/dashboard/components/UpcomingDeadlinesList'

export const Route = createFileRoute('/_authenticated/_org/dashboard/')({
  component: DashboardPage,
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(context.trpc.dashboard.summary.queryOptions()),
  pendingComponent: DashboardSkeleton,
})

function DashboardPage() {
  const { data: summary } = useDashboardSummary()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Your compliance posture across obligations, checklists and open gaps."
      />
      <SummaryCards summary={summary} />
      <div className="grid gap-4 md:grid-cols-2">
        <ChecklistStatusChart data={summary.checklistByStatus} />
        <GapSeverityChart data={summary.openGapsBySeverity} />
      </div>
      <UpcomingDeadlinesList deadlines={summary.upcomingDeadlines} />
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-9 w-48" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
      <Skeleton className="h-48" />
    </div>
  )
}
