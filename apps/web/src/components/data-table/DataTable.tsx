import { useState } from 'react'
import {
  type ColumnDef,
  type RowSelectionState,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
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
import { Checkbox } from '#/components/ui/checkbox'
import { Input } from '#/components/ui/input'
import { cn } from '#/lib/utils'
import { useDebouncedValue } from '#/lib/useDebouncedValue'
import { DataTablePagination } from './DataTablePagination'
import { DataTableToolbar } from './DataTableToolbar'

// Column defs are plain data, so per-column presentation (width, alignment,
// responsive hiding) has nowhere to live except `meta`. Declaration-merged
// here so column files get real typing on it rather than an `any` escape.
declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends unknown, TValue> {
    headerClassName?: string
    cellClassName?: string
  }
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  toolbar?: React.ReactNode
  emptyState?: React.ReactNode
  onRowClick?: (row: TData) => void
  isLoading?: boolean
  // Explicit accessor rather than TanStack's default global-filter behavior
  // (which only sees accessorFn columns) — some searchable text (e.g.
  // obligation code) lives only inside a cell renderer, not an accessor.
  getSearchValue?: (row: TData) => string
  searchPlaceholder?: string
  enableRowSelection?: boolean
  bulkActions?: (selectedRows: TData[], clearSelection: () => void) => React.ReactNode
  defaultSorting?: SortingState
  // Opt out of the built-in client-side pagination for tables whose page is
  // already a server page (document.list's cursor pagination). Without this
  // the two fight: TanStack would slice the 20-row server page into 10-row
  // client pages *and* render a second Prev/Next under the page's own.
  manualPagination?: boolean
  // Rendered in place of the built-in pagination footer — lets a server-
  // paginated table keep the footer in the same slot/spacing as every other
  // table instead of the page bolting a second row on underneath.
  footer?: React.ReactNode
}

// Generic TanStack Table + shadcn Table wrapper. Per-domain code only
// supplies column defs (features/<domain>/columns.tsx) and data — this
// handles sorting UI, client-side pagination, and the empty-state slot.
// Server-side pagination (document.list's cursor pagination) is layered on
// top by the consuming page via `manualPagination` + `footer`.
export function DataTable<TData, TValue>({
  columns,
  data,
  toolbar,
  emptyState,
  onRowClick,
  isLoading,
  getSearchValue,
  searchPlaceholder,
  enableRowSelection,
  bulkActions,
  defaultSorting,
  manualPagination,
  footer,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>(defaultSorting ?? [])
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [searchInput, setSearchInput] = useState('')
  const globalFilter = useDebouncedValue(searchInput, 250)

  const selectionColumn: ColumnDef<TData, TValue> = {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        onClick={(e) => e.stopPropagation()}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        onClick={(e) => e.stopPropagation()}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
  }
  const tableColumns = enableRowSelection ? [selectionColumn, ...columns] : columns

  const table = useReactTable({
    data,
    columns: tableColumns,
    // globalFilter is controlled entirely by our own debounced searchInput
    // state (no onGlobalFilterChange) — the toolbar Input below is the only
    // writer, so the table never needs to report filter changes back.
    state: { sorting, rowSelection, globalFilter },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: manualPagination ? undefined : getPaginationRowModel(),
    manualPagination,
    getFilteredRowModel: getSearchValue ? getFilteredRowModel() : undefined,
    globalFilterFn: getSearchValue
      ? (row, _columnId, filterValue: string) =>
          getSearchValue(row.original).toLowerCase().includes(filterValue.toLowerCase())
      : undefined,
    enableRowSelection,
  })

  const isEmpty = !isLoading && data.length === 0
  const selectedRows = table.getSelectedRowModel().rows.map((row) => row.original)

  return (
    <div className="space-y-4">
      {(toolbar || getSearchValue) && (
        <DataTableToolbar>
          {getSearchValue && (
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={searchPlaceholder ?? 'Search…'}
              className="w-full bg-card sm:w-64"
            />
          )}
          {toolbar}
        </DataTableToolbar>
      )}
      {enableRowSelection && bulkActions && selectedRows.length > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-border bg-accent/40 px-4 py-2.5">
          <p className="text-sm font-medium">
            {selectedRows.length} selected
          </p>
          <div className="flex items-center gap-2">
            {bulkActions(selectedRows, () => table.resetRowSelection())}
          </div>
        </div>
      )}
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
                      className={cn(
                        'h-11 bg-background px-4 text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase',
                        header.column.columnDef.meta?.headerClassName,
                      )}
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
                  <TableCell colSpan={tableColumns.length} className="h-auto p-4">
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
                        ? 'group/row cursor-pointer border-border outline-none transition-colors hover:bg-accent/50 focus-visible:bg-accent/50'
                        : 'border-border hover:bg-accent/30'
                    }
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className={cn('px-4 py-3.5', cell.column.columnDef.meta?.cellClassName)}
                      >
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
      {footer ?? (!isEmpty && !manualPagination && <DataTablePagination table={table} />)}
    </div>
  )
}
