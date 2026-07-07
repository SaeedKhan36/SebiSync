import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { CitationPanel } from '#/components/CitationPanel'
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
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>{obligation.title}</CardTitle>
            <p className="text-muted-foreground text-xs">{obligation.code}</p>
          </div>
          <ChecklistStatusSelect
            status={item.status}
            disabled={updateStatus.isPending}
            onStatusChange={(status) => updateStatus.mutate({ id: item.id, status })}
          />
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
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
          {item.client && (
            <div>
              <p className="text-muted-foreground text-xs">Client</p>
              <p>{item.client.name}</p>
            </div>
          )}
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
