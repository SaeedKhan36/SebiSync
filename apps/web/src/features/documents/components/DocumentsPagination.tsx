import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '#/components/ui/button'

interface DocumentsPaginationProps {
  count: number
  // 0-based index of the current server page, derived from the cursor stack.
  pageIndex: number
  hasPreviousPage: boolean
  hasNextPage: boolean
  onPrevious: () => void
  onNext: () => void
}

// document.list is cursor-paginated with no total/offset metadata, so this
// deliberately claims only what is knowable: how many rows are on this page,
// which page number it is, and whether there is another one. No "of N pages".
export function DocumentsPagination({
  count,
  pageIndex,
  hasPreviousPage,
  hasNextPage,
  onPrevious,
  onNext,
}: DocumentsPaginationProps) {
  const isPaged = pageIndex > 0 || hasNextPage
  return (
    <div className="flex items-center justify-between gap-4 px-1">
      <p className="text-[13px] text-muted-foreground" aria-live="polite">
        <span className="font-medium text-foreground">{count}</span>{' '}
        {count === 1 ? 'document' : 'documents'}
        {isPaged && (
          <>
            <span className="mx-1.5 text-border">·</span>
            Page {pageIndex + 1}
          </>
        )}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="bg-card"
          disabled={!hasPreviousPage}
          onClick={onPrevious}
        >
          <ChevronLeft className="size-4" />
          <span className="hidden sm:inline">Previous</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="bg-card"
          disabled={!hasNextPage}
          onClick={onNext}
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}
