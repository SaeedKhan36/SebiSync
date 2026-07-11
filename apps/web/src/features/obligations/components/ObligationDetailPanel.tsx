import { Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { CitationPanel } from '#/components/CitationPanel'
import { StatusBadge } from '#/components/status/StatusBadge'
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
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>{obligation.title}</CardTitle>
            <p className="text-muted-foreground text-xs">{obligation.code}</p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge value={obligation.status} map={obligationStatusColorMap} />
            {obligation.status === 'DRAFT' && (
              <PublishObligationButton obligationId={obligation.id} />
            )}
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          {obligation.status === 'PUBLISHED' && (
            <div className="col-span-2 flex items-center gap-2">
              {obligation.fanOutStatus === 'IN_PROGRESS' && (
                <Loader2 className="text-muted-foreground size-3.5 animate-spin" />
              )}
              <StatusBadge value={obligation.fanOutStatus} map={obligationFanOutStatusColorMap} />
              {obligation.fanOutStatus === 'FAILED' && obligation.fanOutError && (
                <p className="text-destructive text-xs">{obligation.fanOutError}</p>
              )}
            </div>
          )}
          <p className="col-span-2">{obligation.description}</p>
          <div>
            <p className="text-muted-foreground text-xs">Obligated action</p>
            <p>{obligation.obligatedAction}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Frequency</p>
            <p>{obligation.frequency ?? '—'}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Deadline</p>
            <p>{obligation.deadlineDays != null ? `${obligation.deadlineDays} days` : '—'}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Penalty / risk</p>
            <p>{obligation.penaltyOrRisk ?? '—'}</p>
          </div>
          <div className="col-span-2">
            <p className="text-muted-foreground text-xs">Applicable categories</p>
            <CategoryChips categories={obligation.applicableCategories} />
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
