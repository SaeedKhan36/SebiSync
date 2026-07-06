import { AlertTriangle } from 'lucide-react'
import type { GapSeverity } from '@sebi/schemas'
import { Badge } from '#/components/ui/badge'
import { cn } from '#/lib/utils'
import { gapSeverityColorMap } from './statusColorMaps'

// Thin wrapper over the generic color map, adding an icon for CRITICAL —
// the single most safety-critical enum value in the app gets a stronger
// visual signal than color alone.
export function GapSeverityBadge({ severity }: { severity: GapSeverity }) {
  const entry = gapSeverityColorMap[severity]
  return (
    <Badge variant={entry.variant} className={cn(entry.className, 'gap-1')}>
      {severity === 'CRITICAL' && <AlertTriangle className="size-3" />}
      {entry.label}
    </Badge>
  )
}
