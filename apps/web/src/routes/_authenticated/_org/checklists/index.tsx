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
import { checklistStatusColorMap } from '#/components/status/statusColorMaps'
import { useChecklistList } from '#/features/checklists/hooks/useChecklistList'
import { useClientOptions } from '#/features/checklists/hooks/useClientOptions'
import { ChecklistTable } from '#/features/checklists/components/ChecklistTable'

const ALL = 'ALL'
const STATUS_VALUES = Object.keys(checklistStatusColorMap) as [
  keyof typeof checklistStatusColorMap,
  ...Array<keyof typeof checklistStatusColorMap>,
]

// Defined natively with apps/web's own zod (v4) rather than reusing
// @sebi/schemas's checklistStatusSchema (zod v3) — mixing a v3 schema
// instance inside a v4 z.object() call breaks TanStack Router's search-param
// type inference down to `unknown` (confirmed by typecheck). This is the one
// spot in the app where the enum's literal values are duplicated instead of
// imported, specifically because of that cross-version boundary.
const checklistSearchSchema = z.object({
  status: z.enum(STATUS_VALUES).optional(),
  clientId: z.string().optional(),
})

export const Route = createFileRoute('/_authenticated/_org/checklists/')({
  component: ChecklistsPage,
  validateSearch: checklistSearchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    context.queryClient.ensureQueryData(context.trpc.checklist.listByIntermediary.queryOptions(deps)),
  pendingComponent: ChecklistsSkeleton,
})

function ChecklistsPage() {
  const filters = Route.useSearch()
  const navigate = Route.useNavigate()
  const { data: items } = useChecklistList(filters)
  const clientOptions = useClientOptions()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Checklists"
        description="Every obligation assigned to your organisation and clients, with live fulfilment status."
      />
      <ChecklistTable
        items={items}
        filters={filters}
        onRowClick={(item) => {
          window.location.href = `/checklists/${item.id}`
        }}
        toolbar={
          <>
            <Select
              value={filters.status ?? ALL}
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
                    {checklistStatusColorMap[value].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.clientId ?? ALL}
              onValueChange={(value) =>
                navigate({
                  search: (prev) => ({ ...prev, clientId: value === ALL ? undefined : value }),
                })
              }
            >
              <SelectTrigger className="w-full bg-card sm:w-44">
                <SelectValue placeholder="All clients" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All clients</SelectItem>
                {clientOptions.data?.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        }
      />
    </div>
  )
}

function ChecklistsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-9 w-48" />
      <Skeleton className="h-96" />
    </div>
  )
}
