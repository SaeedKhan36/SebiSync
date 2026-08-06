import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { PageHeader } from '#/components/layout/PageHeader'
import { Skeleton } from '#/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { gapSeverityColorMap } from '#/components/status/statusColorMaps'
import { useGapList } from '#/features/gaps/hooks/useGapList'
import { GapTable } from '#/features/gaps/components/GapTable'
import { BulkResolveGapsDialog } from '#/features/gaps/components/BulkResolveGapsDialog'

const ALL = 'ALL'
const SEVERITY_VALUES = Object.keys(gapSeverityColorMap) as [
  keyof typeof gapSeverityColorMap,
  ...Array<keyof typeof gapSeverityColorMap>,
]
const RESOLVED_VALUES = ['unresolved', 'resolved'] as const

// Native v4 schema, not @sebi/schemas's v3 gapSeveritySchema — same Zod
// v3/v4 boundary rule as Phase 6's checklistSearchSchema. `resolved` is a
// tri-state string enum (not a raw boolean) so it round-trips cleanly
// through the URL and maps onto a finite Select option list.
const gapSearchSchema = z.object({
  severity: z.enum(SEVERITY_VALUES).optional(),
  resolved: z.enum(RESOLVED_VALUES).optional(),
})

export const Route = createFileRoute('/_authenticated/_org/gaps/')({
  component: GapsPage,
  validateSearch: gapSearchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    context.queryClient.ensureQueryData(
      context.trpc.gap.list.queryOptions({
        severity: deps.severity,
        resolved: deps.resolved === undefined ? undefined : deps.resolved === 'resolved',
      }),
    ),
  pendingComponent: GapsSkeleton,
})

function GapsPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const { data: items } = useGapList({
    severity: search.severity,
    resolved: search.resolved === undefined ? undefined : search.resolved === 'resolved',
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gaps"
        description="Detected compliance gaps ranked by severity — resolve them before they become findings."
      />
      <GapTable
        items={items}
        onRowClick={(item) => {
          void navigate({ to: '/gaps/$gapId', params: { gapId: item.id } })
        }}
        enableRowSelection
        bulkActions={(rows, clear) => (
          <BulkResolveGapsDialog
            gapIds={rows.filter((g) => !g.resolvedAt).map((g) => g.id)}
            onDone={clear}
          />
        )}
        toolbar={
          <>
            <Select
              value={search.severity ?? ALL}
              onValueChange={(value) =>
                navigate({
                  search: (prev) => ({
                    ...prev,
                    severity: value === ALL ? undefined : (value as (typeof SEVERITY_VALUES)[number]),
                  }),
                })
              }
            >
              <SelectTrigger className="w-full bg-card sm:w-44">
                <SelectValue placeholder="All severities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All severities</SelectItem>
                {SEVERITY_VALUES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {gapSeverityColorMap[value].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={search.resolved ?? ALL}
              onValueChange={(value) =>
                navigate({
                  search: (prev) => ({
                    ...prev,
                    resolved: value === ALL ? undefined : (value as (typeof RESOLVED_VALUES)[number]),
                  }),
                })
              }
            >
              <SelectTrigger className="w-full bg-card sm:w-44">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All statuses</SelectItem>
                <SelectItem value="unresolved">Unresolved</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
      />
    </div>
  )
}

function GapsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-9 w-48" />
      <Skeleton className="h-96" />
    </div>
  )
}
