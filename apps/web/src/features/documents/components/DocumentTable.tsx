import { FileText } from 'lucide-react'
import { DataTable } from '#/components/data-table/DataTable'
import { EmptyState } from '#/components/EmptyState'
import { documentColumns } from '#/features/documents/columns'
import type { DocumentListItem } from '#/features/documents/hooks/useDocumentList'

interface DocumentTableProps {
  items: DocumentListItem[]
  toolbar?: React.ReactNode
  onRowClick: (item: DocumentListItem) => void
}

export function DocumentTable({ items, toolbar, onRowClick }: DocumentTableProps) {
  return (
    <DataTable
      columns={documentColumns}
      data={items}
      toolbar={toolbar}
      onRowClick={onRowClick}
      emptyState={
        <EmptyState
          icon={FileText}
          title="No documents"
          description="Upload a regulatory circular to get started."
        />
      }
    />
  )
}
