import { Users } from 'lucide-react'
import { DataTable } from '#/components/data-table/DataTable'
import { EmptyState } from '#/components/EmptyState'
import { clientColumns } from '#/features/clients/columns'
import type { ClientListItem } from '#/features/clients/hooks/useClientList'

interface ClientTableProps {
  items: ClientListItem[]
  toolbar?: React.ReactNode
  onRowClick: (item: ClientListItem) => void
}

export function ClientTable({ items, toolbar, onRowClick }: ClientTableProps) {
  return (
    <DataTable
      columns={clientColumns}
      data={items}
      toolbar={toolbar}
      onRowClick={onRowClick}
      emptyState={
        <EmptyState
          icon={Users}
          title="No clients yet"
          description="Add your first client to start assigning per-client compliance checklists."
        />
      }
    />
  )
}
