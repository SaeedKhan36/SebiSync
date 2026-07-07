import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { GapSeverityBadge } from '#/components/status/GapSeverityBadge'
import { gapTypeLabelMap } from '#/components/status/statusColorMaps'
import { EmptyState } from '#/components/EmptyState'
import { formatDate } from '#/lib/format'
import type { ChecklistDetail } from '#/features/checklists/hooks/useChecklistDetail'

interface GapsSectionProps {
  gaps: ChecklistDetail['gaps']
}

// Read-only — gap resolution gets its own detail page in Phase 8. Row click
// is a plain <a> since /gaps/$gapId doesn't exist yet (same "prove the
// wiring, not the destination" pattern used everywhere in the app so far).
export function GapsSection({ gaps }: GapsSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Gaps</CardTitle>
      </CardHeader>
      <CardContent>
        {gaps.length === 0 ? (
          <EmptyState title="No gaps" description="No compliance gaps detected for this item." />
        ) : (
          <ul className="divide-y">
            {gaps.map((gap) => (
              <li key={gap.id} className="py-3 first:pt-0 last:pb-0">
                <a href={`/gaps/${gap.id}`} className="flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{gapTypeLabelMap[gap.gapType]}</p>
                    <p className="text-muted-foreground text-xs">
                      Detected {formatDate(gap.detectedAt)}
                      {gap.resolvedAt ? ` · Resolved ${formatDate(gap.resolvedAt)}` : ' · Unresolved'}
                    </p>
                  </div>
                  <GapSeverityBadge severity={gap.severity} />
                </a>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
