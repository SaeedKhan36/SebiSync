import { FileText, SearchX } from 'lucide-react'
import { DataTable } from '#/components/data-table/DataTable'
import { EmptyState } from '#/components/EmptyState'
import { Button } from '#/components/ui/button'
import { documentColumns } from '#/features/documents/columns'
import type { DocumentListItem } from '#/features/documents/hooks/useDocumentList'

interface DocumentTableProps {
  items: DocumentListItem[]
  toolbar?: React.ReactNode
  footer?: React.ReactNode
  // True when a status/search filter is narrowing the list — an empty result
  // then means "nothing matched", not "nothing uploaded", and the two need
  // different copy and a different way out.
  isFiltered?: boolean
  onClearFilters?: () => void
  onRowClick: (item: DocumentListItem) => void
}

export function DocumentTable({
  items,
  toolbar,
  footer,
  isFiltered,
  onClearFilters,
  onRowClick,
}: DocumentTableProps) {
  return (
    <DataTable
      columns={documentColumns}
      data={items}
      toolbar={toolbar}
      footer={footer}
      // document.list is cursor-paginated on the server; the page owns the
      // footer controls, so the built-in client pagination stays off.
      manualPagination
      onRowClick={onRowClick}
      emptyState={
        isFiltered ? (
          <EmptyState
            icon={SearchX}
            title="No matching documents"
            description="No circular matches the current search and status filters."
            action={
              onClearFilters && (
                <Button variant="outline" size="sm" onClick={onClearFilters}>
                  Clear filters
                </Button>
              )
            }
          />
        ) : (
          <EmptyState
            icon={FileText}
            title="No documents"
            description="Upload a regulatory circular to get started."
          />
        )
      }
    />
  )
}
