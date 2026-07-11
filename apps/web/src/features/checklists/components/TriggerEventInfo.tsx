import { Zap } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { DetailField } from '#/components/DetailField'
import { formatDate } from '#/lib/format'
import type { ChecklistDetail } from '#/features/checklists/hooks/useChecklistDetail'

interface TriggerEventInfoProps {
  triggerEvent: NonNullable<ChecklistDetail['triggerEvent']>
}

// Read-only — checklist.createTriggerEvent creates the TriggerEvent and this
// ComplianceChecklistItem together, so by the time this item's detail page
// is viewable, the event has already happened. Creating a *new* PER_EVENT
// occurrence is a separate flow, deferred to a later phase.
export function TriggerEventInfo({ triggerEvent }: TriggerEventInfoProps) {
  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[15px] font-semibold">
          <Zap className="size-4 text-[#3730a3]" />
          Trigger event
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
        <DetailField label="Event type">{triggerEvent.eventType}</DetailField>
        <DetailField label="Event date">{formatDate(triggerEvent.eventDate)}</DetailField>
        {triggerEvent.referenceNo && (
          <DetailField label="Reference no.">
            <span className="font-mono text-[13px]">{triggerEvent.referenceNo}</span>
          </DetailField>
        )}
      </CardContent>
    </Card>
  )
}
