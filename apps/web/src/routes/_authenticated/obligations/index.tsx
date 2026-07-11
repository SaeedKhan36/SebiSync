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
import { obligationStatusColorMap } from '#/components/status/statusColorMaps'
import { useObligationList } from '#/features/obligations/hooks/useObligationList'
import { ObligationTable } from '#/features/obligations/components/ObligationTable'

const ALL = 'ALL'
const STATUS_VALUES = Object.keys(obligationStatusColorMap) as [
  keyof typeof obligationStatusColorMap,
  ...Array<keyof typeof obligationStatusColorMap>,
]

// Native v4 schema per the Zod v3/v4 boundary rule. documentId has no
// visible filter Select — it's only ever set via the "View obligations"
// link from a document's detail page.
const obligationSearchSchema = z.object({
  status: z.enum(STATUS_VALUES).optional(),
  categoryCode: z.string().optional(),
  documentId: z.string().optional(),
})

export const Route = createFileRoute('/_authenticated/obligations/')({
  component: ObligationsPage,
  validateSearch: obligationSearchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    context.queryClient.ensureQueryData(context.trpc.obligation.list.queryOptions(deps)),
  pendingComponent: ObligationsSkeleton,
})

function ObligationsPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const { data: items } = useObligationList(search)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Obligations"
        description="The extracted obligation register — every requirement traced back to its source circular."
      />
      <ObligationTable
        items={items}
        onRowClick={(item) => {
          window.location.href = `/obligations/${item.id}`
        }}
        toolbar={
          <Select
            value={search.status ?? ALL}
            onValueChange={(value) =>
              navigate({
                search: (prev) => ({
                  ...prev,
                  status: value === ALL ? undefined : (value as (typeof STATUS_VALUES)[number]),
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
                  {obligationStatusColorMap[value].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />
    </div>
  )
}

function ObligationsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-9 w-48" />
      <Skeleton className="h-96" />
    </div>
  )
}
