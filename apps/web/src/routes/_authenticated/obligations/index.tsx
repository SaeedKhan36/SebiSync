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
import type { DataTableGroupBy } from '#/components/data-table/DataTable'
import { obligationStatusColorMap } from '#/components/status/statusColorMaps'
import { useIntermediaryCategoriesSuspense } from '#/features/intermediary/hooks/useIntermediaryCategories'
import {
  useObligationList,
  type ObligationListItem,
} from '#/features/obligations/hooks/useObligationList'
import { ObligationTable } from '#/features/obligations/components/ObligationTable'
import { CategoryGroupHeader } from '#/features/obligations/components/CategoryGroupHeader'

const ALL = 'ALL'
const STATUS_VALUES = Object.keys(obligationStatusColorMap) as [
  keyof typeof obligationStatusColorMap,
  ...Array<keyof typeof obligationStatusColorMap>,
]
const UNCATEGORISED = 'UNCATEGORISED'

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
    Promise.all([
      context.queryClient.ensureQueryData(context.trpc.obligation.list.queryOptions(deps)),
      // Drives both the filter Select and the group ordering/labels, so the
      // six category codes stay defined in one place (the DB) instead of
      // gaining a fourth hardcoded copy on the web side.
      context.queryClient.ensureQueryData(
        context.trpc.intermediary.listCategories.queryOptions(),
      ),
    ]),
  pendingComponent: ObligationsSkeleton,
})

function ObligationsPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const { data: items } = useObligationList(search)
  const { data: categories } = useIntermediaryCategoriesSuspense()

  const categoryNames = new Map(categories.map((category) => [category.code, category.name]))

  // An obligation binding several categories is listed under each of them,
  // mirroring how checklist fan-out treats it (propagateObligation fans out to
  // every intermediary in every applicable category). Group counts therefore
  // sum to more than the row count.
  const groupBy: DataTableGroupBy<ObligationListItem> = {
    order: categories.map((category) => category.code),
    getGroupKeys: (item) => {
      const codes = item.applicableCategories.map((category) => category.code)
      // Intersect with the active filter, or a DEPOSITORY-filtered view would
      // still spawn an MII group for DEPOSITORY + MII rows, reading as if the
      // filter had leaked.
      return search.categoryCode
        ? codes.filter((code) => code === search.categoryCode)
        : codes
    },
    emptyKey: UNCATEGORISED,
    renderHeader: (key, count, state) => (
      <CategoryGroupHeader
        name={
          key === UNCATEGORISED ? 'Uncategorised' : (categoryNames.get(key) ?? key)
        }
        code={key === UNCATEGORISED ? undefined : key}
        count={count}
        isCollapsed={state.isCollapsed}
        onToggle={state.toggle}
      />
    ),
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Obligations"
        description="The extracted obligation register — every requirement traced back to its source circular."
      />
      <ObligationTable
        items={items}
        groupBy={groupBy}
        onRowClick={(item) => {
          void navigate({ to: '/obligations/$obligationId', params: { obligationId: item.id } })
        }}
        toolbar={
          <>
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
            <Select
              value={search.categoryCode ?? ALL}
              onValueChange={(value) =>
                navigate({
                  search: (prev) => ({
                    ...prev,
                    categoryCode: value === ALL ? undefined : value,
                  }),
                })
              }
            >
              <SelectTrigger className="w-full bg-card sm:w-56">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.code}>
                    {category.name}
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

function ObligationsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-9 w-48" />
      <Skeleton className="h-96" />
    </div>
  )
}
