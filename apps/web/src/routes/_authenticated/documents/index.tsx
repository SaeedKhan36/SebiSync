import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { PageHeader } from '#/components/layout/PageHeader'
import { Skeleton } from '#/components/ui/skeleton'
import { Button } from '#/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { docStatusColorMap } from '#/components/status/statusColorMaps'
import { useDocumentList, DOCUMENT_PAGE_SIZE } from '#/features/documents/hooks/useDocumentList'
import { DocumentTable } from '#/features/documents/components/DocumentTable'
import { DocumentUploadForm } from '#/features/documents/components/DocumentUploadForm'

const ALL = 'ALL'
const STATUS_VALUES = Object.keys(docStatusColorMap) as [
  keyof typeof docStatusColorMap,
  ...Array<keyof typeof docStatusColorMap>,
]

// Native v4 schema per the Zod v3/v4 boundary rule. cursor lives in the URL
// (Table Strategy: "a shared link resumes correctly") — forward-only ("Next"),
// no "Previous" affordance in this phase given document.list returns no
// pagination metadata to build a back-stack from server data alone.
const documentSearchSchema = z.object({
  status: z.enum(STATUS_VALUES).optional(),
  cursor: z.string().optional(),
})

export const Route = createFileRoute('/_authenticated/documents/')({
  component: DocumentsPage,
  validateSearch: documentSearchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    context.queryClient.ensureQueryData(
      context.trpc.document.list.queryOptions({ ...deps, limit: DOCUMENT_PAGE_SIZE }),
    ),
  pendingComponent: DocumentsSkeleton,
})

function DocumentsPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const { data: items } = useDocumentList(search)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documents"
        description="SEBI circulars and master circulars ingested into the extraction pipeline."
        action={
          <DocumentUploadForm
            onCreated={(documentId) => {
              window.location.href = `/documents/${documentId}`
            }}
          />
        }
      />
      <DocumentTable
        items={items}
        onRowClick={(item) => {
          window.location.href = `/documents/${item.id}`
        }}
        toolbar={
          <Select
            value={search.status ?? ALL}
            onValueChange={(value) =>
              navigate({
                search: {
                  status: value === ALL ? undefined : (value as (typeof STATUS_VALUES)[number]),
                  cursor: undefined,
                },
              })
            }
          >
            <SelectTrigger className="w-full bg-card sm:w-44">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              {STATUS_VALUES.map((value) => (
                <SelectItem key={value} value={value}>
                  {docStatusColorMap[value].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />
      {items.length === DOCUMENT_PAGE_SIZE && (
        <Button
          variant="outline"
          onClick={() =>
            navigate({ search: (prev) => ({ ...prev, cursor: items[items.length - 1]!.id }) })
          }
        >
          Next page
        </Button>
      )}
    </div>
  )
}

function DocumentsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-9 w-48" />
      <Skeleton className="h-96" />
    </div>
  )
}
