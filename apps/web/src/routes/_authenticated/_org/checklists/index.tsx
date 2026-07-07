import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { checklistStatusSchema } from '@sebi/schemas'
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

const checklistSearchSchema = z.object({
  status: checklistStatusSchema.optional(),
  clientId: z.string().optional(),
})

const ALL = 'ALL'
const STATUS_VALUES = Object.keys(checklistStatusColorMap) as Array<
  keyof typeof checklistStatusColorMap
>

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
      <PageHeader title="Checklists" />
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
              <SelectTrigger className="w-44">
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
              <SelectTrigger className="w-44">
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
