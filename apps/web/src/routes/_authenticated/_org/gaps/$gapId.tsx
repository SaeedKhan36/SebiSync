import { createFileRoute } from '@tanstack/react-router'
import { PageHeader } from '#/components/layout/PageHeader'
import { Skeleton } from '#/components/ui/skeleton'
import { GapDetailPanel } from '#/features/gaps/components/GapDetailPanel'
import { useGapDetail } from '#/features/gaps/hooks/useGapDetail'

export const Route = createFileRoute('/_authenticated/_org/gaps/$gapId')({
  component: GapDetailPage,
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(context.trpc.gap.get.queryOptions({ id: params.gapId })),
  pendingComponent: GapDetailSkeleton,
})

function GapDetailPage() {
  const { gapId } = Route.useParams()
  const { data: gap } = useGapDetail(gapId)

  return (
    <div className="space-y-6">
      <PageHeader
        title={gap.checklistItem.obligation.title}
        breadcrumbs={[{ label: 'Gaps', to: '/gaps' }, { label: gap.checklistItem.obligation.code }]}
      />
      <div className="max-w-2xl">
        <GapDetailPanel gap={gap} />
      </div>
    </div>
  )
}

function GapDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-96 max-w-2xl" />
    </div>
  )
}
