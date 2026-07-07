import type { ColumnDef } from '@tanstack/react-table'
import { DataTableColumnHeader } from '#/components/data-table/DataTableColumnHeader'
import { formatDate } from '#/lib/format'
import { ChecklistStatusSelect } from '#/features/checklists/components/ChecklistStatusSelect'
import type { ChecklistListFilters, ChecklistListItem } from '#/features/checklists/hooks/useChecklistList'

export function getChecklistColumns(
  activeFilters: ChecklistListFilters,
): ColumnDef<ChecklistListItem>[] {
  return [
    {
      id: 'client',
      header: 'Client',
      accessorFn: (row) => row.client?.name ?? '—',
    },
    {
      id: 'obligation',
      header: 'Obligation',
      accessorFn: (row) => row.obligation.title,
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.obligation.title}</p>
          <p className="text-muted-foreground text-xs">{row.original.obligation.code}</p>
        </div>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      accessorKey: 'status',
      cell: ({ row }) => (
        <ChecklistStatusSelect
          checklistItemId={row.original.id}
          status={row.original.status}
          activeFilters={activeFilters}
        />
      ),
    },
    {
      id: 'dueDate',
      accessorKey: 'dueDate',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Due date" />,
      cell: ({ row }) => (row.original.dueDate ? formatDate(row.original.dueDate) : '—'),
    },
  ]
}
