import { Gavel } from 'lucide-react'
import { DataTable, type DataTableGroupBy } from '#/components/data-table/DataTable'
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
  groupBy?: DataTableGroupBy<ObligationListItem>
}

export function ObligationTable({
  items,
  toolbar,
  onRowClick,
  enableRowSelection,
  bulkActions,
  defaultSorting,
  groupBy,
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
      groupBy={groupBy}
      emptyState={
        <EmptyState icon={Gavel} title="No obligations" description="Nothing matches the current filters." />
      }
    />
  )
}
