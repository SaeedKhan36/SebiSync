import { createFileRoute } from '@tanstack/react-router'
import { PageHeader } from '#/components/layout/PageHeader'
import { Skeleton } from '#/components/ui/skeleton'
import { useObligationList } from '#/features/obligations/hooks/useObligationList'
import { useSupersessionProposals } from '#/features/obligations/hooks/useSupersessionProposals'
import { ObligationTable } from '#/features/obligations/components/ObligationTable'
import { BulkPublishBar } from '#/features/obligations/components/BulkPublishBar'
import { SupersessionReviewPanel } from '#/features/obligations/components/SupersessionReviewPanel'

// Thin, hardcoded to status: 'DRAFT' — no status filter UI here at all,
// since the review queue's entire purpose is "only DRAFT". A separate route
// (not a filter toggle on /obligations) per the architecture's page
// breakdown.
//
// Amendment mappings are reviewed on this same page rather than a route of
// their own: deciding "this draft replaces that obligation" and deciding "this
// draft goes live" are one reviewer's job on one queue, and splitting them
// invites publishing an amendment without ever looking at what it retires.
export const Route = createFileRoute('/_authenticated/obligations/review')({
  component: ObligationReviewPage,
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(
        context.trpc.obligation.list.queryOptions({ status: 'DRAFT' }),
      ),
      context.queryClient.ensureQueryData(
        context.trpc.obligation.supersessionProposals.queryOptions(undefined),
      ),
    ]),
  pendingComponent: ReviewSkeleton,
})

function ObligationReviewPage() {
  const navigate = Route.useNavigate()
  const { data: items } = useObligationList({ status: 'DRAFT' })
  const { data: proposals } = useSupersessionProposals()

  return (
    <div className="space-y-6">
      <PageHeader title="Review queue" />
      <SupersessionReviewPanel proposals={proposals} />
      <ObligationTable
        items={items}
        onRowClick={(item) => {
          void navigate({ to: '/obligations/$obligationId', params: { obligationId: item.id } })
        }}
        enableRowSelection
        bulkActions={(rows, clear) => (
          <BulkPublishBar ids={rows.map((r) => r.id)} onDone={clear} />
        )}
        defaultSorting={[{ id: 'confidence', desc: false }]}
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
