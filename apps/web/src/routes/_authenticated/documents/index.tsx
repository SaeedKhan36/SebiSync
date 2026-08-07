import { useEffect, useRef, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { PageHeader } from '#/components/layout/PageHeader'
import { Skeleton } from '#/components/ui/skeleton'
import { useDebouncedValue } from '#/lib/useDebouncedValue'
import { useDocumentList, DOCUMENT_PAGE_SIZE } from '#/features/documents/hooks/useDocumentList'
import { DocumentTable } from '#/features/documents/components/DocumentTable'
import { DocumentUploadForm } from '#/features/documents/components/DocumentUploadForm'
import { DocumentsPagination } from '#/features/documents/components/DocumentsPagination'
import { DOC_STATUS_VALUES, DocumentsToolbar } from '#/features/documents/components/DocumentsToolbar'

// Native v4 schema per the Zod v3/v4 boundary rule. cursor lives in the URL
// (Table Strategy: "a shared link resumes correctly"). `stack` holds the
// cursor of every prior page visited so "Previous" can pop back to it —
// document.list returns no total/offset metadata, so this client-side
// back-stack is the lowest-churn way to get working Prev/Next.
const documentSearchSchema = z.object({
  status: z.enum(DOC_STATUS_VALUES).optional(),
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
  const { data: items, isFetching } = useDocumentList(search)

  const stack = search.stack ?? []
  const urlSearch = search.search ?? ''
  const isFiltered = urlSearch !== '' || search.status !== undefined
  // No total count comes back from the cursor query, so "there is a next
  // page" can only be inferred from having received a full page of rows.
  const hasNextPage = items.length === DOCUMENT_PAGE_SIZE

  const [searchInput, setSearchInput] = useState(urlSearch)
  const debouncedSearchInput = useDebouncedValue(searchInput, 300)

  // Holds the last value this component wrote to the URL, so the pull-back
  // effect below can tell our own navigation echoing back (ignore it) from an
  // external change like Back/Forward or "Clear filters" (adopt it). Without
  // this, an in-flight navigation could clobber newer keystrokes.
  const pushedSearch = useRef(urlSearch)

  useEffect(() => {
    if (debouncedSearchInput === (search.search ?? '')) return
    pushedSearch.current = debouncedSearchInput
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

  useEffect(() => {
    if (urlSearch === pushedSearch.current) return
    pushedSearch.current = urlSearch
    setSearchInput(urlSearch)
  }, [urlSearch])

  function clearFilters() {
    setSearchInput('')
    pushedSearch.current = ''
    void navigate({ search: () => ({}) })
  }

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
      {/* Dims while a filter/page change is in flight so the rows on screen
          read as stale rather than current, without a layout-shifting swap
          to a skeleton. */}
      <div
        aria-busy={isFetching}
        className={`transition-opacity duration-200 ${isFetching ? 'opacity-60' : ''}`}
      >
        <DocumentTable
          items={items}
          isFiltered={isFiltered}
          onClearFilters={clearFilters}
          onRowClick={(item) => {
            void navigate({ to: '/documents/$documentId', params: { documentId: item.id } })
          }}
          toolbar={
            <DocumentsToolbar
              searchInput={searchInput}
              onSearchInputChange={setSearchInput}
              status={search.status}
              onStatusChange={(status) =>
                navigate({
                  search: (prev) => ({ ...prev, status, cursor: undefined, stack: undefined }),
                })
              }
              isFiltered={isFiltered}
              onClearFilters={clearFilters}
            />
          }
          footer={
            <DocumentsPagination
              count={items.length}
              pageIndex={stack.length}
              hasPreviousPage={stack.length > 0}
              hasNextPage={hasNextPage}
              onPrevious={() =>
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
              onNext={() =>
                navigate({
                  search: (prev) => ({
                    ...prev,
                    stack: [...(prev.stack ?? []), prev.cursor ?? ''],
                    cursor: items[items.length - 1]!.id,
                  }),
                })
              }
            />
          }
        />
      </div>
    </div>
  )
}

// Mirrors the real page's shape (header, toolbar, table card with rows) so
// the transition into loaded content doesn't reflow.
function DocumentsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-44" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Skeleton className="h-9 w-full sm:w-72" />
          <Skeleton className="h-9 w-full sm:w-48" />
        </div>
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="h-11 border-b border-border bg-background" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 border-b border-border px-4 py-3.5">
              <Skeleton className="size-9 shrink-0 rounded-md" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/4" />
              </div>
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
