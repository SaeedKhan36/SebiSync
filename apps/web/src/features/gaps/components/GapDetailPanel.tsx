import { Link } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Button } from '#/components/ui/button'
import { CitationPanel } from '#/components/CitationPanel'
import { GapSeverityBadge } from '#/components/status/GapSeverityBadge'
import { gapTypeLabelMap } from '#/components/status/statusColorMaps'
import { formatDate } from '#/lib/format'
import { GapResolutionForm } from '#/features/gaps/components/GapResolutionForm'
import type { GapDetail } from '#/features/gaps/hooks/useGapDetail'

interface GapDetailPanelProps {
  gap: GapDetail
}

export function GapDetailPanel({ gap }: GapDetailPanelProps) {
  const { checklistItem } = gap
  const { obligation } = checklistItem

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>{obligation.title}</CardTitle>
            <p className="text-muted-foreground text-xs">{obligation.code}</p>
          </div>
          <GapSeverityBadge severity={gap.severity} />
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">Gap type</p>
            <p>{gapTypeLabelMap[gap.gapType]}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Detected</p>
            <p>{formatDate(gap.detectedAt)}</p>
          </div>
          {checklistItem.client && (
            <div>
              <p className="text-muted-foreground text-xs">Client</p>
              <p>{checklistItem.client.name}</p>
            </div>
          )}
          <div className="col-span-2">
            <Button asChild variant="outline" size="sm">
              <Link
                to="/checklists/$checklistItemId"
                params={{ checklistItemId: checklistItem.id }}
              >
                View checklist item
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <CitationPanel
        citationText={obligation.citationText}
        citationPage={obligation.citationPage}
        citationSection={obligation.citationSection}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resolution</CardTitle>
        </CardHeader>
        <CardContent>
          {gap.resolvedAt ? (
            <div className="space-y-1 text-sm">
              <p className="text-muted-foreground text-xs">
                Resolved {formatDate(gap.resolvedAt)}
              </p>
              <p>{gap.resolutionNote}</p>
            </div>
          ) : (
            <GapResolutionForm gapId={gap.id} checklistItemId={checklistItem.id} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
