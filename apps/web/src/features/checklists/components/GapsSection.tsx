import { Link } from '@tanstack/react-router'
import { ShieldAlert } from 'lucide-react'
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
    <Card className="gap-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[15px] font-semibold">
          <ShieldAlert className="size-4 text-[#b91c1c] dark:text-red-400" />
          Gaps
        </CardTitle>
      </CardHeader>
      <CardContent>
        {gaps.length === 0 ? (
          <EmptyState title="No gaps" description="No compliance gaps detected for this item." />
        ) : (
          <ul className="divide-y divide-border">
            {gaps.map((gap) => (
              <li key={gap.id}>
                <Link
                  to="/gaps/$gapId"
                  params={{ gapId: gap.id }}
                  className="group -mx-2 flex items-center justify-between gap-3 rounded-md px-2 py-3 transition-colors hover:bg-accent/60"
                >
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium group-hover:text-[#3730a3] dark:group-hover:text-indigo-300">
                      {gapTypeLabelMap[gap.gapType]}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Detected {formatDate(gap.detectedAt)}
                      {gap.resolvedAt
                        ? ` · Resolved ${formatDate(gap.resolvedAt)}`
                        : ' · Unresolved'}
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
