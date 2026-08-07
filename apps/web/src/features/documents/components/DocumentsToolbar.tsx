import { Search, X } from 'lucide-react'
import type { DocStatus } from '@sebi/schemas'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { StatusBadge } from '#/components/status/StatusBadge'
import { docStatusColorMap } from '#/components/status/statusColorMaps'

export const ALL_STATUSES = 'ALL'

export const DOC_STATUS_VALUES = Object.keys(docStatusColorMap) as [DocStatus, ...DocStatus[]]

interface DocumentsToolbarProps {
  // Uncontrolled-by-URL on purpose: the input stays responsive while the
  // owning page debounces it into the search params.
  searchInput: string
  onSearchInputChange: (value: string) => void
  status: DocStatus | undefined
  onStatusChange: (status: DocStatus | undefined) => void
  isFiltered: boolean
  onClearFilters: () => void
}

export function DocumentsToolbar({
  searchInput,
  onSearchInputChange,
  status,
  onStatusChange,
  isFiltered,
  onClearFilters,
}: DocumentsToolbarProps) {
  return (
    <>
      <div className="relative w-full sm:w-72">
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          value={searchInput}
          onChange={(e) => onSearchInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape' && searchInput) {
              e.preventDefault()
              onSearchInputChange('')
            }
          }}
          placeholder="Search title or circular number…"
          aria-label="Search documents by title or circular number"
          className="bg-card pr-9 pl-9"
        />
        {searchInput && (
          <button
            type="button"
            onClick={() => onSearchInputChange('')}
            aria-label="Clear search"
            className="absolute top-1/2 right-1.5 flex size-6 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
      <Select
        value={status ?? ALL_STATUSES}
        onValueChange={(value) =>
          onStatusChange(value === ALL_STATUSES ? undefined : (value as DocStatus))
        }
      >
        <SelectTrigger aria-label="Filter documents by status" className="w-full bg-card sm:w-48">
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_STATUSES}>All statuses</SelectItem>
          {/* The real badge, not a paraphrase of it — the filter and the
              Status column then read as the same vocabulary. */}
          {DOC_STATUS_VALUES.map((value) => (
            <SelectItem key={value} value={value}>
              <StatusBadge value={value} map={docStatusColorMap} />
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isFiltered && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearFilters}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" />
          Clear filters
        </Button>
      )}
    </>
  )
}
