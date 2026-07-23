import { createFileRoute } from '@tanstack/react-router'
import { PageHeader } from '#/components/layout/PageHeader'
import { Skeleton } from '#/components/ui/skeleton'
import { useObligationList } from '#/features/obligations/hooks/useObligationList'
import { ObligationTable } from '#/features/obligations/components/ObligationTable'

// Thin, hardcoded to status: 'DRAFT' — no status filter UI here at all,
// since the review queue's entire purpose is "only DRAFT". A separate route
// (not a filter toggle on /obligations) per the architecture's page
// breakdown.
export const Route = createFileRoute('/_authenticated/obligations/review')({
  component: ObligationReviewPage,
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(
      context.trpc.obligation.list.queryOptions({ status: 'DRAFT' }),
    ),
  pendingComponent: ReviewSkeleton,
})

function ObligationReviewPage() {
  const navigate = Route.useNavigate()
  const { data: items } = useObligationList({ status: 'DRAFT' })

  return (
    <div className="space-y-6">
      <PageHeader title="Review queue" />
      <ObligationTable
        items={items}
        onRowClick={(item) => {
          void navigate({ to: '/obligations/$obligationId', params: { obligationId: item.id } })
        }}
      />
    </div>
  )
}

function ReviewSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-9 w-48" />
      <Skeleton className="h-96" />
    </div>
  )
}
