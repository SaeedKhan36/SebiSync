import { createFileRoute } from '@tanstack/react-router'
import { PageHeader } from '#/components/layout/PageHeader'
import { Skeleton } from '#/components/ui/skeleton'
import { Button } from '#/components/ui/button'
import { Card, CardContent } from '#/components/ui/card'
import { StatusBadge } from '#/components/status/StatusBadge'
import { docStatusColorMap } from '#/components/status/statusColorMaps'
import { formatDate } from '#/lib/format'
import { useDocumentDetail } from '#/features/documents/hooks/useDocumentDetail'
import { ExtractionProgress } from '#/features/documents/components/ExtractionProgress'

export const Route = createFileRoute('/_authenticated/documents/$documentId')({
  component: DocumentDetailPage,
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(
      context.trpc.document.get.queryOptions({ id: params.documentId }),
    ),
  pendingComponent: DocumentDetailSkeleton,
})

function DocumentDetailPage() {
  const { documentId } = Route.useParams()
  const { data: document } = useDocumentDetail(documentId)

  if (!document) return <DocumentDetailSkeleton />

  return (
    <div className="space-y-6">
      <PageHeader
        title={document.title}
        breadcrumbs={[{ label: 'Documents', to: '/documents' }, { label: document.circularNumber }]}
      />
      <Card>
        <CardContent className="grid grid-cols-2 gap-4 py-6 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">Circular number</p>
            <p>{document.circularNumber}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Issued date</p>
            <p>{formatDate(document.issuedDate)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Status</p>
            <StatusBadge value={document.status} map={docStatusColorMap} />
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Obligations extracted</p>
            <p>{document._count.obligations}</p>
          </div>
          <div className="col-span-2">
            <a
              href={document.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="text-primary text-xs underline"
            >
              Source URL
            </a>
          </div>
        </CardContent>
      </Card>

      <ExtractionProgress
        documentId={document.id}
        status={document.status}
        hasFile={document.r2ObjectKey !== ''}
      />

      {document.status === 'EXTRACTED' && (
        <Button asChild>
          <a href={`/obligations?documentId=${document.id}`}>View obligations</a>
        </Button>
      )}

      {document.status === 'FAILED' && (
        <Card>
          <CardContent className="text-destructive py-4 text-sm">
            Extraction failed. Check the worker logs for details.
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function DocumentDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-40" />
    </div>
  )
}
