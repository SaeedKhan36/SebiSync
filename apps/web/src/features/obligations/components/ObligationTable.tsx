import { Gavel } from 'lucide-react'
import { DataTable } from '#/components/data-table/DataTable'
import { EmptyState } from '#/components/EmptyState'
import { obligationColumns } from '#/features/obligations/columns'
import type { ObligationListItem } from '#/features/obligations/hooks/useObligationList'

interface ObligationTableProps {
  items: ObligationListItem[]
  toolbar?: React.ReactNode
  onRowClick: (item: ObligationListItem) => void
}

export function ObligationTable({ items, toolbar, onRowClick }: ObligationTableProps) {
  return (
    <DataTable
      columns={obligationColumns}
      data={items}
      toolbar={toolbar}
      onRowClick={onRowClick}
      emptyState={
        <EmptyState icon={Gavel} title="No obligations" description="Nothing matches the current filters." />
      }
    />
  )
}
