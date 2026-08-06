import { Gavel, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { CitationPanel } from '#/components/CitationPanel'
import { DetailField } from '#/components/DetailField'
import { StatusBadge } from '#/components/status/StatusBadge'
import { ConfidenceIndicator } from '#/components/status/ConfidenceIndicator'
import { obligationStatusColorMap, obligationFanOutStatusColorMap } from '#/components/status/statusColorMaps'
import { CategoryChips } from '#/features/obligations/components/CategoryChips'
import { PublishObligationButton } from '#/features/obligations/components/PublishObligationButton'
import type { ObligationDetail } from '#/features/obligations/hooks/useObligationDetail'

export function ObligationDetailPanel({ obligation }: { obligation: ObligationDetail }) {
  const sourceChunks = obligation.sourceChunks.map((sc) => ({
    chunkId: sc.chunk.id,
    text: sc.chunk.text,
    page: sc.chunk.pageNumber,
    section: sc.chunk.sectionPath,
  }))

  return (
    <div className="space-y-4">
      <Card className="gap-4">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-[15px] font-semibold">
              <Gavel className="size-4 shrink-0 text-[#3730a3]" />
              {obligation.title}
            </CardTitle>
            <p className="font-mono text-xs text-muted-foreground">{obligation.code}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <StatusBadge value={obligation.status} map={obligationStatusColorMap} />
            {obligation.status === 'DRAFT' && (
              <PublishObligationButton obligationId={obligation.id} />
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {obligation.status === 'PUBLISHED' && (
            <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-background px-3 py-2">
              {obligation.fanOutStatus === 'IN_PROGRESS' && (
                <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
              )}
              <StatusBadge value={obligation.fanOutStatus} map={obligationFanOutStatusColorMap} />
              {obligation.fanOutStatus === 'FAILED' && obligation.fanOutError && (
                <p className="text-xs text-destructive">{obligation.fanOutError}</p>
              )}
            </div>
          )}
          <p className="text-sm leading-relaxed text-foreground">{obligation.description}</p>
          <div className="grid grid-cols-1 gap-x-6 gap-y-4 border-t border-dashed border-border pt-4 sm:grid-cols-2">
            <DetailField label="Obligated action" className="sm:col-span-2">
              {obligation.obligatedAction}
            </DetailField>
            <DetailField label="Frequency">{obligation.frequency ?? '—'}</DetailField>
            <DetailField label="Deadline">
              {obligation.deadlineDays != null ? `${obligation.deadlineDays} days` : '—'}
            </DetailField>
            <DetailField label="Penalty / risk">{obligation.penaltyOrRisk ?? '—'}</DetailField>
            <DetailField label="Extraction confidence">
              <ConfidenceIndicator value={obligation.extractionConfidence} />
            </DetailField>
            <DetailField label="Applicable categories" className="sm:col-span-2">
              <CategoryChips categories={obligation.applicableCategories} />
            </DetailField>
          </div>
        </CardContent>
      </Card>

      <CitationPanel
        citationText={obligation.citationText}
        citationPage={obligation.citationPage}
        citationSection={obligation.citationSection}
        sourceChunks={sourceChunks}
      />
    </div>
  )
}
