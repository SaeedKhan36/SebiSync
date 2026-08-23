import { createFileRoute } from '@tanstack/react-router'
import { ShieldCheck } from 'lucide-react'
import { PageHeader } from '#/components/layout/PageHeader'
import { Skeleton } from '#/components/ui/skeleton'
import { EmptyState } from '#/components/EmptyState'
import { useChecklistList } from '#/features/checklists/hooks/useChecklistList'
import { ChecklistTable } from '#/features/checklists/components/ChecklistTable'
import { useIsOrgAdmin } from '#/features/auth/hooks/useIsOrgAdmin'

const REVIEW_FILTERS = { status: 'PENDING_REVIEW' as const }

export const Route = createFileRoute('/_authenticated/_org/checklists/review')({
  component: ChecklistReviewPage,
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(
      context.trpc.checklist.listByIntermediary.queryOptions(REVIEW_FILTERS),
    ),
  pendingComponent: ReviewSkeleton,
})

function ChecklistReviewPage() {
  const navigate = Route.useNavigate()
  const isAdmin = useIsOrgAdmin()
  const { data: items } = useChecklistList(REVIEW_FILTERS)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Review queue"
        description="Evidence submitted against checklist items, waiting for an admin decision."
      />
      {isAdmin ? (
        <ChecklistTable
          items={items}
          filters={REVIEW_FILTERS}
          onRowClick={(item) => {
            void navigate({ to: '/checklists/$checklistItemId', params: { checklistItemId: item.id } })
          }}
        />
      ) : (
        <EmptyState
          icon={ShieldCheck}
          title="Review is admin-only"
          description="Only organisation admins can approve or reject submitted evidence."
        />
      )}
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
