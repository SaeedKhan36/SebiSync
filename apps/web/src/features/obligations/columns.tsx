import type { ColumnDef } from '@tanstack/react-table'
import { StatusBadge } from '#/components/status/StatusBadge'
import { obligationStatusColorMap } from '#/components/status/statusColorMaps'
import { ConfidenceIndicator } from '#/components/status/ConfidenceIndicator'
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
  {
    id: 'confidence',
    header: 'Confidence',
    // Sorts nulls to the bottom regardless of direction, so ascending sort
    // (used by the review queue's defaultSorting) surfaces the lowest real
    // confidence scores first rather than untyped/null ones.
    accessorFn: (row) => row.extractionConfidence ?? undefined,
    sortUndefined: 'last',
    cell: ({ row }) => <ConfidenceIndicator value={row.original.extractionConfidence} />,
  },
]
