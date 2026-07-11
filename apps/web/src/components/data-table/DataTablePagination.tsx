import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Table } from '@tanstack/react-table'
import { Button } from '#/components/ui/button'

interface DataTablePaginationProps<TData> {
  table: Table<TData>
}

export function DataTablePagination<TData>({ table }: DataTablePaginationProps<TData>) {
  const total = table.getFilteredRowModel().rows.length
  return (
    <div className="flex items-center justify-between px-1">
      <p className="text-[13px] text-muted-foreground">
        <span className="font-medium text-foreground">{total}</span>{' '}
        {total === 1 ? 'item' : 'items'}
        <span className="mx-1.5 text-border">·</span>
        Page {table.getState().pagination.pageIndex + 1} of{' '}
        {Math.max(table.getPageCount(), 1)}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="bg-card"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          <ChevronLeft className="size-4" />
          <span className="hidden sm:inline">Previous</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="bg-card"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}
