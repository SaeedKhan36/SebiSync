import { ShieldAlert } from 'lucide-react'
import { DataTable } from '#/components/data-table/DataTable'
import { EmptyState } from '#/components/EmptyState'
import { gapColumns } from '#/features/gaps/columns'
import type { GapListItem } from '#/features/gaps/hooks/useGapList'

interface GapTableProps {
  items: GapListItem[]
  toolbar?: React.ReactNode
  onRowClick: (item: GapListItem) => void
  enableRowSelection?: boolean
  bulkActions?: (selectedRows: GapListItem[], clearSelection: () => void) => React.ReactNode
}

export function GapTable({ items, toolbar, onRowClick, enableRowSelection, bulkActions }: GapTableProps) {
  return (
    <DataTable
      columns={gapColumns}
      data={items}
      toolbar={toolbar}
      onRowClick={onRowClick}
      getSearchValue={(g) =>
        `${g.checklistItem.obligation.title} ${g.checklistItem.obligation.code} ${g.checklistItem.client?.name ?? ''}`
      }
      searchPlaceholder="Search gaps…"
      enableRowSelection={enableRowSelection}
      bulkActions={bulkActions}
      emptyState={
        <EmptyState
          icon={ShieldAlert}
          title="No gaps"
          description="Nothing matches the current filters."
        />
      }
    />
  )
}
