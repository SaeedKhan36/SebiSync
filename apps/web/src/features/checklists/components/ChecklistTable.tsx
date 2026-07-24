import { ListChecks } from 'lucide-react'
import { DataTable } from '#/components/data-table/DataTable'
import { EmptyState } from '#/components/EmptyState'
import { getChecklistColumns } from '#/features/checklists/columns'
import type { ChecklistListFilters, ChecklistListItem } from '#/features/checklists/hooks/useChecklistList'

interface ChecklistTableProps {
  items: ChecklistListItem[]
  filters: ChecklistListFilters
  toolbar?: React.ReactNode
  onRowClick: (item: ChecklistListItem) => void
}

export function ChecklistTable({ items, filters, toolbar, onRowClick }: ChecklistTableProps) {
  return (
    <DataTable
      columns={getChecklistColumns(filters)}
      data={items}
      toolbar={toolbar}
      onRowClick={onRowClick}
      getSearchValue={(item) => `${item.obligation.title} ${item.obligation.code} ${item.client?.name ?? ''}`}
      searchPlaceholder="Search checklist items…"
      emptyState={
        <EmptyState
          icon={ListChecks}
          title="No checklist items"
          description="Nothing matches the current filters."
        />
      }
    />
  )
}
