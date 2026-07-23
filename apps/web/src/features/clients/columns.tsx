import type { ColumnDef } from '@tanstack/react-table'
import { DataTableColumnHeader } from '#/components/data-table/DataTableColumnHeader'
import { formatDate } from '#/lib/format'
import type { ClientListItem } from '#/features/clients/hooks/useClientList'

export const clientColumns: ColumnDef<ClientListItem>[] = [
  {
    id: 'name',
    accessorKey: 'name',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
    cell: ({ row }) => <p className="font-medium">{row.original.name}</p>,
  },
  {
    id: 'onboardedAt',
    accessorKey: 'onboardedAt',
    header: 'Onboarded',
    cell: ({ row }) => (row.original.onboardedAt ? formatDate(row.original.onboardedAt) : '—'),
  },
  {
    id: 'createdAt',
    accessorKey: 'createdAt',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Added" />,
    cell: ({ row }) => formatDate(row.original.createdAt),
  },
]
