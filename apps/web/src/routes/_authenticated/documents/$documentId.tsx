import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight, ExternalLink, FileText } from 'lucide-react'
import { PageHeader } from '#/components/layout/PageHeader'
import { Skeleton } from '#/components/ui/skeleton'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { DetailField } from '#/components/DetailField'
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
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title={document.title}
        breadcrumbs={[{ label: 'Documents', to: '/documents' }, { label: document.circularNumber }]}
      />
      <Card className="gap-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[15px] font-semibold">
            <FileText className="size-4 text-[#3730a3] dark:text-indigo-300" />
            Circular details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
            <DetailField label="Circular number">
              <span className="font-mono text-[13px]">{document.circularNumber}</span>
            </DetailField>
            <DetailField label="Issued date">{formatDate(document.issuedDate)}</DetailField>
            <DetailField label="Status">
              <StatusBadge value={document.status} map={docStatusColorMap} />
            </DetailField>
            <DetailField label="Obligations extracted">
              <span className="font-semibold tabular-nums">{document._count.obligations}</span>
            </DetailField>
          </div>
          <div className="border-t border-dashed border-border pt-4">
            <a
              href={document.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[#3730a3] dark:text-indigo-300 hover:underline"
            >
              View source circular
              <ExternalLink className="size-3.5" />
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
          <Link to="/obligations" search={{ documentId: document.id }}>
            View extracted obligations
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      )}
    </div>
  )
}

function DocumentDetailSkeleton() {
  return (
    <div className="max-w-3xl space-y-6">
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-40" />
    </div>
  )
}
