import { createFileRoute } from '@tanstack/react-router'
import { PageHeader } from '#/components/layout/PageHeader'
import { Skeleton } from '#/components/ui/skeleton'
import { ObligationDetailPanel } from '#/features/obligations/components/ObligationDetailPanel'
import { useObligationDetail } from '#/features/obligations/hooks/useObligationDetail'

export const Route = createFileRoute('/_authenticated/obligations/$obligationId')({
  component: ObligationDetailPage,
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(
      context.trpc.obligation.get.queryOptions({ id: params.obligationId }),
    ),
  pendingComponent: ObligationDetailSkeleton,
})

function ObligationDetailPage() {
  const { obligationId } = Route.useParams()
  const { data: obligation } = useObligationDetail(obligationId)

  return (
    <div className="space-y-6">
      <PageHeader
        title={obligation.title}
        breadcrumbs={[{ label: 'Obligations', to: '/obligations' }, { label: obligation.code }]}
      />
      <div className="max-w-2xl">
        <ObligationDetailPanel obligation={obligation} />
      </div>
    </div>
  )
}

function ObligationDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-96 max-w-2xl" />
    </div>
  )
}
