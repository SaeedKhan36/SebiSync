import { Gavel } from 'lucide-react'
import { DataTable } from '#/components/data-table/DataTable'
import { EmptyState } from '#/components/EmptyState'
import { obligationColumns } from '#/features/obligations/columns'
import type { ObligationListItem } from '#/features/obligations/hooks/useObligationList'

interface ObligationTableProps {
  items: ObligationListItem[]
  toolbar?: React.ReactNode
  onRowClick: (item: ObligationListItem) => void
  enableRowSelection?: boolean
  bulkActions?: (
    selectedRows: ObligationListItem[],
    clearSelection: () => void,
  ) => React.ReactNode
  defaultSorting?: { id: string; desc: boolean }[]
}

export function ObligationTable({
  items,
  toolbar,
  onRowClick,
  enableRowSelection,
  bulkActions,
  defaultSorting,
}: ObligationTableProps) {
  return (
    <DataTable
      columns={obligationColumns}
      data={items}
      toolbar={toolbar}
      onRowClick={onRowClick}
      getSearchValue={(o) => `${o.title} ${o.code}`}
      searchPlaceholder="Search obligations…"
      enableRowSelection={enableRowSelection}
      bulkActions={bulkActions}
      defaultSorting={defaultSorting}
      emptyState={
        <EmptyState icon={Gavel} title="No obligations" description="Nothing matches the current filters." />
      }
    />
  )
}
