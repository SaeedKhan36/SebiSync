import { useState } from 'react'
import {
  type ColumnDef,
  type RowSelectionState,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { DataTablePagination } from './DataTablePagination'
import { DataTableToolbar } from './DataTableToolbar'

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  toolbar?: React.ReactNode
  emptyState?: React.ReactNode
  onRowClick?: (row: TData) => void
  isLoading?: boolean
}

// Generic TanStack Table + shadcn Table wrapper. Per-domain code only
// supplies column defs (features/<domain>/columns.tsx) and data — this
// handles sorting UI, client-side pagination, and the empty-state slot.
// Server-side pagination (document.list's cursor pagination) is layered on
// top by the consuming page, not by this component.
export function DataTable<TData, TValue>({
  columns,
  data,
  toolbar,
  emptyState,
  onRowClick,
  isLoading,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  const table = useReactTable({
    data,
    columns,
    state: { sorting, rowSelection },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  const isEmpty = !isLoading && data.length === 0

  return (
    <div className="space-y-4">
      {toolbar && <DataTableToolbar>{toolbar}</DataTableToolbar>}
      {/* White card container; inner horizontal scroll keeps the table
          usable on narrow viewports without crushing columns. */}
      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-[0_1px_2px_rgba(28,25,23,0.04)]">
        <div className="overflow-x-auto">
          <Table className="min-w-[640px]">
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="border-border hover:bg-transparent">
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className="h-11 bg-background px-4 text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {isEmpty ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={columns.length} className="h-auto p-4">
                    {emptyState}
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && 'selected'}
                    onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                    onKeyDown={
                      onRowClick
                        ? (e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              onRowClick(row.original)
                            }
                          }
                        : undefined
                    }
                    tabIndex={onRowClick ? 0 : undefined}
                    role={onRowClick ? 'button' : undefined}
                    className={
                      onRowClick
                        ? 'cursor-pointer border-border outline-none hover:bg-accent/50 focus-visible:bg-accent/50'
                        : 'border-border hover:bg-accent/30'
                    }
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="px-4 py-3.5">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      {!isEmpty && <DataTablePagination table={table} />}
    </div>
  )
}
