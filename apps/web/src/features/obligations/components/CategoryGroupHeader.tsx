import { ChevronDown, ChevronRight } from 'lucide-react'
import { Badge } from '#/components/ui/badge'

interface CategoryGroupHeaderProps {
  name: string
  // Omitted for the uncategorised bucket, which has no real category code.
  code?: string
  count: number
  isCollapsed: boolean
  onToggle: () => void
}

// A subdued band styled after the table's own <TableHead>, so a group reads as
// a section label rather than a data row.
export function CategoryGroupHeader({
  name,
  code,
  count,
  isCollapsed,
  onToggle,
}: CategoryGroupHeaderProps) {
  const Chevron = isCollapsed ? ChevronRight : ChevronDown

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={!isCollapsed}
      className="flex w-full items-center gap-2 bg-muted/40 px-4 py-2.5 text-left text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase transition-colors hover:bg-muted/70 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset focus-visible:outline-none"
    >
      <Chevron className="size-3.5 shrink-0" aria-hidden />
      <span>{name}</span>
      {code && (
        <Badge variant="outline" className="text-[10px] font-medium tracking-normal">
          {code}
        </Badge>
      )}
      <span className="ml-auto tabular-nums">{count}</span>
    </button>
  )
}
