import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { PageHeader } from '#/components/layout/PageHeader'
import { Skeleton } from '#/components/ui/skeleton'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { docStatusColorMap } from '#/components/status/statusColorMaps'
import { useDebouncedValue } from '#/lib/useDebouncedValue'
import { useDocumentList, DOCUMENT_PAGE_SIZE } from '#/features/documents/hooks/useDocumentList'
import { DocumentTable } from '#/features/documents/components/DocumentTable'
import { DocumentUploadForm } from '#/features/documents/components/DocumentUploadForm'

const ALL = 'ALL'
const STATUS_VALUES = Object.keys(docStatusColorMap) as [
  keyof typeof docStatusColorMap,
  ...Array<keyof typeof docStatusColorMap>,
]

// Native v4 schema per the Zod v3/v4 boundary rule. cursor lives in the URL
// (Table Strategy: "a shared link resumes correctly"). `stack` holds the
// cursor of every prior page visited so "Previous" can pop back to it —
// document.list returns no total/offset metadata, so this client-side
// back-stack is the lowest-churn way to get working Prev/Next.
const documentSearchSchema = z.object({
  status: z.enum(STATUS_VALUES).optional(),
  search: z.string().optional(),
  cursor: z.string().optional(),
  stack: z.array(z.string()).optional(),
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

  const stack = search.stack ?? []

  const [searchInput, setSearchInput] = useState(search.search ?? '')
  const debouncedSearchInput = useDebouncedValue(searchInput, 300)
  useEffect(() => {
    if (debouncedSearchInput === (search.search ?? '')) return
    void navigate({
      search: (prev) => ({
        ...prev,
        search: debouncedSearchInput || undefined,
        cursor: undefined,
        stack: undefined,
      }),
    })
    // Only re-run when the debounced input changes — `search`/`navigate`
    // would otherwise retrigger this effect after every navigation it causes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchInput])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documents"
        description="SEBI circulars and master circulars ingested into the extraction pipeline."
        action={
          <DocumentUploadForm
            onCreated={(documentId) => {
              void navigate({ to: '/documents/$documentId', params: { documentId } })
            }}
          />
        }
      />
      <DocumentTable
        items={items}
        onRowClick={(item) => {
          void navigate({ to: '/documents/$documentId', params: { documentId: item.id } })
        }}
        toolbar={
          <>
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search title or circular number…"
              className="w-full bg-card sm:w-64"
            />
            <Select
              value={search.status ?? ALL}
              onValueChange={(value) =>
                navigate({
                  search: (prev) => ({
                    ...prev,
                    status: value === ALL ? undefined : (value as (typeof STATUS_VALUES)[number]),
                    cursor: undefined,
                    stack: undefined,
                  }),
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
          </>
        }
      />
      <div className="flex items-center justify-between px-1">
        <p className="text-[13px] text-muted-foreground">
          Page {stack.length + 1}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="bg-card"
            disabled={stack.length === 0}
            onClick={() =>
              navigate({
                search: (prev) => {
                  const prevStack = prev.stack ?? []
                  return {
                    ...prev,
                    cursor: prevStack.at(-1) || undefined,
                    stack: prevStack.slice(0, -1),
                  }
                },
              })
            }
          >
            <ChevronLeft className="size-4" />
            <span className="hidden sm:inline">Previous</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="bg-card"
            disabled={items.length < DOCUMENT_PAGE_SIZE}
            onClick={() =>
              navigate({
                search: (prev) => ({
                  ...prev,
                  stack: [...(prev.stack ?? []), prev.cursor ?? ''],
                  cursor: items[items.length - 1]!.id,
                }),
              })
            }
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
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
