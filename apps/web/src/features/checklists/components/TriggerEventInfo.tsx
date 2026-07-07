import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
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
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Trigger event</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-muted-foreground text-xs">Event type</p>
          <p>{triggerEvent.eventType}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Event date</p>
          <p>{formatDate(triggerEvent.eventDate)}</p>
        </div>
        {triggerEvent.referenceNo && (
          <div>
            <p className="text-muted-foreground text-xs">Reference no.</p>
            <p>{triggerEvent.referenceNo}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
