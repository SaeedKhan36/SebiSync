import { Badge } from '#/components/ui/badge'
import { cn } from '#/lib/utils'
import type { StatusEntry } from './statusColorMaps'

interface StatusBadgeProps<T extends string> {
  value: T
  map: Record<T, StatusEntry>
  className?: string
  // Opt-in slot before the label, for the rare status that needs a second
  // channel beyond color + text — e.g. a pulsing dot marking a document
  // that is actively mid-pipeline rather than parked in a settled state.
  leading?: React.ReactNode
}

// Generic — one component serves every enum in the app (DocStatus,
// ObligationStatus, ChecklistStatus, GapSeverity). Color communicates
// meaning only, per the design system decision; never decorative.
export function StatusBadge<T extends string>({
  value,
  map,
  className,
  leading,
}: StatusBadgeProps<T>) {
  const entry = map[value]
  return (
    <Badge variant={entry.variant} className={cn(entry.className, className)}>
      {leading}
      {entry.label}
    </Badge>
  )
}
