import { ShieldAlert } from 'lucide-react'
import { DataTable } from '#/components/data-table/DataTable'
import { EmptyState } from '#/components/EmptyState'
import { gapColumns } from '#/features/gaps/columns'
import type { GapListItem } from '#/features/gaps/hooks/useGapList'

interface GapTableProps {
  items: GapListItem[]
  toolbar?: React.ReactNode
  onRowClick: (item: GapListItem) => void
}

export function GapTable({ items, toolbar, onRowClick }: GapTableProps) {
  return (
    <DataTable
      columns={gapColumns}
      data={items}
      toolbar={toolbar}
      onRowClick={onRowClick}
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
