import { Link } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { GapSeverityBadge } from '#/components/status/GapSeverityBadge'
import { gapTypeLabelMap } from '#/components/status/statusColorMaps'
import { EmptyState } from '#/components/EmptyState'
import { formatDate } from '#/lib/format'
import type { ChecklistDetail } from '#/features/checklists/hooks/useChecklistDetail'

interface GapsSectionProps {
  gaps: ChecklistDetail['gaps']
}

// Read-only — gap resolution has its own detail page (Phase 8). Row click
// is now a real Link since /gaps/$gapId exists as of Phase 8 — upgraded from
// the plain <a> placeholder used while writing Phase 7.
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
                <Link
                  to="/gaps/$gapId"
                  params={{ gapId: gap.id }}
                  className="flex items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{gapTypeLabelMap[gap.gapType]}</p>
                    <p className="text-muted-foreground text-xs">
                      Detected {formatDate(gap.detectedAt)}
                      {gap.resolvedAt ? ` · Resolved ${formatDate(gap.resolvedAt)}` : ' · Unresolved'}
                    </p>
                  </div>
                  <GapSeverityBadge severity={gap.severity} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
