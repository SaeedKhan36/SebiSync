import type { ColumnDef } from '@tanstack/react-table'
import { StatusBadge } from '#/components/status/StatusBadge'
import { docStatusColorMap } from '#/components/status/statusColorMaps'
import { formatDate } from '#/lib/format'
import type { DocumentListItem } from '#/features/documents/hooks/useDocumentList'

export const documentColumns: ColumnDef<DocumentListItem>[] = [
  {
    id: 'title',
    header: 'Title',
    accessorFn: (row) => row.title,
    cell: ({ row }) => (
      <div>
        <p className="font-medium">{row.original.title}</p>
        <p className="text-muted-foreground text-xs">{row.original.circularNumber}</p>
      </div>
    ),
  },
  {
    id: 'issuedDate',
    header: 'Issued',
    cell: ({ row }) => formatDate(row.original.issuedDate),
  },
  {
    id: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge value={row.original.status} map={docStatusColorMap} />,
  },
]
