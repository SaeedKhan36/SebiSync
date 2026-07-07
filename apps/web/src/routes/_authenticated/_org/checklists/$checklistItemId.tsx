import { createFileRoute } from '@tanstack/react-router'
import { PageHeader } from '#/components/layout/PageHeader'
import { Skeleton } from '#/components/ui/skeleton'
import { AuditTimeline } from '#/components/AuditTimeline'
import { ChecklistDetailPanel } from '#/features/checklists/components/ChecklistDetailPanel'
import { GapsSection } from '#/features/checklists/components/GapsSection'
import { EvidenceList } from '#/features/evidence/components/EvidenceList'
import { EvidenceUploadDialog } from '#/features/evidence/components/EvidenceUploadDialog'
import { useChecklistDetail } from '#/features/checklists/hooks/useChecklistDetail'
import { useAuditLog } from '#/features/audit/hooks/useAuditLog'

export const Route = createFileRoute('/_authenticated/_org/checklists/$checklistItemId')({
  component: ChecklistDetailPage,
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(
      context.trpc.checklist.getDetail.queryOptions({ id: params.checklistItemId }),
    ),
  pendingComponent: ChecklistDetailSkeleton,
})

function ChecklistDetailPage() {
  const { checklistItemId } = Route.useParams()
  const { data: item } = useChecklistDetail(checklistItemId)
  const auditLog = useAuditLog(checklistItemId)

  return (
    <div className="space-y-6">
      <PageHeader
        title={item.obligation.title}
        breadcrumbs={[{ label: 'Checklists', to: '/checklists' }, { label: item.obligation.code }]}
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <ChecklistDetailPanel item={item} />
        <div className="space-y-4">
          <GapsSection gaps={item.gaps} />
          <EvidenceList
            evidenceRecords={item.evidenceRecords}
            action={<EvidenceUploadDialog checklistItemId={item.id} />}
          />
          <AuditTimeline entries={auditLog.data ?? []} />
        </div>
      </div>
    </div>
  )
}

function ChecklistDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-9 w-64" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-96" />
        <Skeleton className="h-96" />
      </div>
    </div>
  )
}
