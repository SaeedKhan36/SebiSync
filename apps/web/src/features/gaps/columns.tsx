import type { ColumnDef } from '@tanstack/react-table'
import { DataTableColumnHeader } from '#/components/data-table/DataTableColumnHeader'
import { Badge } from '#/components/ui/badge'
import { GapSeverityBadge } from '#/components/status/GapSeverityBadge'
import { gapTypeLabelMap } from '#/components/status/statusColorMaps'
import { formatDate } from '#/lib/format'
import type { GapListItem } from '#/features/gaps/hooks/useGapList'

export const gapColumns: ColumnDef<GapListItem>[] = [
  {
    id: 'client',
    header: 'Client',
    accessorFn: (row) => row.checklistItem.client?.name ?? '—',
  },
  {
    id: 'obligation',
    header: 'Obligation',
    accessorFn: (row) => row.checklistItem.obligation.title,
    cell: ({ row }) => (
      <div>
        <p className="font-medium">{row.original.checklistItem.obligation.title}</p>
        <p className="text-muted-foreground text-xs">{row.original.checklistItem.obligation.code}</p>
      </div>
    ),
  },
  {
    id: 'gapType',
    header: 'Type',
    accessorFn: (row) => gapTypeLabelMap[row.gapType],
  },
  {
    id: 'severity',
    header: 'Severity',
    accessorKey: 'severity',
    cell: ({ row }) => <GapSeverityBadge severity={row.original.severity} />,
  },
  {
    id: 'detectedAt',
    accessorKey: 'detectedAt',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Detected" />,
    cell: ({ row }) => formatDate(row.original.detectedAt),
  },
  {
    id: 'resolved',
    header: 'Status',
    cell: ({ row }) =>
      row.original.resolvedAt ? (
        <Badge variant="secondary">Resolved</Badge>
      ) : (
        <Badge variant="destructive">Open</Badge>
      ),
  },
]
