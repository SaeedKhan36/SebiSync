import { Badge } from '#/components/ui/badge'
import { cn } from '#/lib/utils'
import type { StatusEntry } from './statusColorMaps'

interface StatusBadgeProps<T extends string> {
  value: T
  map: Record<T, StatusEntry>
  className?: string
}

// Generic — one component serves every enum in the app (DocStatus,
// ObligationStatus, ChecklistStatus, GapSeverity). Color communicates
// meaning only, per the design system decision; never decorative.
export function StatusBadge<T extends string>({ value, map, className }: StatusBadgeProps<T>) {
  const entry = map[value]
  return (
    <Badge variant={entry.variant} className={cn(entry.className, className)}>
      {entry.label}
    </Badge>
  )
}
