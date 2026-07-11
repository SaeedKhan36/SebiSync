import { Gavel } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { CitationPanel } from '#/components/CitationPanel'
import { DetailField } from '#/components/DetailField'
import { ChecklistStatusSelect } from '#/features/checklists/components/ChecklistStatusSelect'
import { TriggerEventInfo } from '#/features/checklists/components/TriggerEventInfo'
import { useUpdateChecklistStatusDetail } from '#/features/checklists/hooks/useUpdateChecklistStatusDetail'
import type { ChecklistDetail } from '#/features/checklists/hooks/useChecklistDetail'

interface ChecklistDetailPanelProps {
  item: ChecklistDetail
}

export function ChecklistDetailPanel({ item }: ChecklistDetailPanelProps) {
  const updateStatus = useUpdateChecklistStatusDetail(item.id)
  const { obligation } = item

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
          <ChecklistStatusSelect
            status={item.status}
            disabled={updateStatus.isPending}
            onStatusChange={(status) => updateStatus.mutate({ id: item.id, status })}
          />
        </CardHeader>
        <CardContent className="space-y-5">
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
            {item.client && <DetailField label="Client">{item.client.name}</DetailField>}
          </div>
        </CardContent>
      </Card>

      <CitationPanel
        citationText={obligation.citationText}
        citationPage={obligation.citationPage}
        citationSection={obligation.citationSection}
      />

      {item.triggerEvent && <TriggerEventInfo triggerEvent={item.triggerEvent} />}
    </div>
  )
}
