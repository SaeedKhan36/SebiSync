import type { ColumnDef } from '@tanstack/react-table'
import type { ChecklistStatus } from '@sebi/schemas'
import { DataTableColumnHeader } from '#/components/data-table/DataTableColumnHeader'
import { formatDate } from '#/lib/format'
import { ChecklistStatusSelect } from '#/features/checklists/components/ChecklistStatusSelect'
import { useUpdateChecklistStatus } from '#/features/checklists/hooks/useUpdateChecklistStatus'
import type { ChecklistListFilters, ChecklistListItem } from '#/features/checklists/hooks/useChecklistList'

// Owns the list's optimistic mutation hook, then hands a plain callback down
// to the prop-driven ChecklistStatusSelect — the detail page (Phase 7) wires
// the same component to its own (non-optimistic) mutation hook instead.
function ChecklistRowStatusCell({
  checklistItemId,
  status,
  activeFilters,
}: {
  checklistItemId: string
  status: ChecklistStatus
  activeFilters: ChecklistListFilters
}) {
  const updateStatus = useUpdateChecklistStatus(activeFilters)
  return (
    <ChecklistStatusSelect
      status={status}
      disabled={updateStatus.isPending}
      onStatusChange={(next) => updateStatus.mutate({ id: checklistItemId, status: next })}
    />
  )
}

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
        <ChecklistRowStatusCell
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
