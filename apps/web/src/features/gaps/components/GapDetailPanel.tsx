import { Link } from '@tanstack/react-router'
import { ArrowRight, CheckCircle2, ShieldAlert } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Button } from '#/components/ui/button'
import { CitationPanel } from '#/components/CitationPanel'
import { DetailField } from '#/components/DetailField'
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
  const resolved = gap.resolvedAt != null

  return (
    <div className="space-y-4">
      <Card className="gap-4">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-[15px] font-semibold">
              <ShieldAlert className="size-4 shrink-0 text-[#b91c1c] dark:text-red-400" />
              {obligation.title}
            </CardTitle>
            <p className="font-mono text-xs text-muted-foreground">{obligation.code}</p>
          </div>
          <GapSeverityBadge severity={gap.severity} />
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
            <DetailField label="Gap type">{gapTypeLabelMap[gap.gapType]}</DetailField>
            <DetailField label="Detected">{formatDate(gap.detectedAt)}</DetailField>
            {checklistItem.client && (
              <DetailField label="Client">{checklistItem.client.name}</DetailField>
            )}
          </div>
          <div className="border-t border-dashed border-border pt-4">
            <Button asChild variant="outline" size="sm" className="bg-card">
              <Link
                to="/checklists/$checklistItemId"
                params={{ checklistItemId: checklistItem.id }}
              >
                View checklist item
                <ArrowRight className="size-3.5" />
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

      {/* Resolution card carries the semantic state: green when resolved,
          amber "action needed" accent while open. */}
      <Card
        className={`gap-4 border-l-2 ${resolved ? 'border-l-[#15803d] dark:border-l-green-500' : 'border-l-[#b45309] dark:border-l-amber-500'}`}
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[15px] font-semibold">
            {resolved ? (
              <CheckCircle2 className="size-4 text-[#15803d] dark:text-green-400" />
            ) : (
              <ShieldAlert className="size-4 text-[#b45309] dark:text-amber-400" />
            )}
            Resolution
          </CardTitle>
        </CardHeader>
        <CardContent>
          {resolved ? (
            <div className="space-y-1.5">
              <p className="inline-flex items-center gap-1.5 rounded-full bg-[#f0fdf4] dark:bg-green-950/40 px-2.5 py-1 text-[11px] font-medium text-[#15803d] dark:text-green-400">
                <CheckCircle2 className="size-3" />
                Resolved {formatDate(gap.resolvedAt!)}
              </p>
              <p className="text-sm leading-relaxed">{gap.resolutionNote}</p>
            </div>
          ) : (
            <GapResolutionForm gapId={gap.id} checklistItemId={checklistItem.id} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
