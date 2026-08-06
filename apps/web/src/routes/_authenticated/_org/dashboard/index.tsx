import { createFileRoute } from '@tanstack/react-router'
import { PageHeader } from '#/components/layout/PageHeader'
import { Skeleton } from '#/components/ui/skeleton'
import { useDashboardSummary } from '#/features/dashboard/hooks/useDashboardSummary'
import { SummaryCards } from '#/features/dashboard/components/SummaryCards'
import { ChecklistBreakdown } from '#/features/dashboard/components/ChecklistBreakdown'
import { GapSeverityBreakdown } from '#/features/dashboard/components/GapSeverityBreakdown'
import { UpcomingDeadlinesList } from '#/features/dashboard/components/UpcomingDeadlinesList'
import { RegisterStrip } from '#/features/dashboard/components/RegisterStrip'

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
        <ChecklistBreakdown data={summary.checklistByStatus} />
        <GapSeverityBreakdown data={summary.openGapsBySeverity} />
      </div>
      <UpcomingDeadlinesList deadlines={summary.upcomingDeadlines} />
      <RegisterStrip data={summary.obligationsByStatus} />
    </div>
  )
}

// Block sizes deliberately mirror the real layout above. dashboard.summary
// is a ~2s query, so this skeleton is what's actually on screen for most of
// the page's life — a matching silhouette is the cheapest perceived-speed
// win available here.
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-9 w-48" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-56" />
        <Skeleton className="h-56" />
      </div>
      <Skeleton className="h-64" />
      <Skeleton className="h-20" />
    </div>
  )
}
