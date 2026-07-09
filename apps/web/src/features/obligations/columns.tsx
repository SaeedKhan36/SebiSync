import type { ColumnDef } from '@tanstack/react-table'
import { StatusBadge } from '#/components/status/StatusBadge'
import { obligationStatusColorMap } from '#/components/status/statusColorMaps'
import { CategoryChips } from '#/features/obligations/components/CategoryChips'
import type { ObligationListItem } from '#/features/obligations/hooks/useObligationList'

export const obligationColumns: ColumnDef<ObligationListItem>[] = [
  {
    id: 'title',
    header: 'Obligation',
    accessorFn: (row) => row.title,
    cell: ({ row }) => (
      <div>
        <p className="font-medium">{row.original.title}</p>
        <p className="text-muted-foreground text-xs">{row.original.code}</p>
      </div>
    ),
  },
  {
    id: 'categories',
    header: 'Categories',
    cell: ({ row }) => <CategoryChips categories={row.original.applicableCategories} />,
  },
  {
    id: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge value={row.original.status} map={obligationStatusColorMap} />,
  },
]
