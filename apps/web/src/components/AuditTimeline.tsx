import {
  CheckCircle2,
  FileUp,
  ListChecks,
  ShieldAlert,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { EmptyState } from '#/components/EmptyState'
import { formatDate } from '#/lib/format'

// Hand-written rather than derived from inferRouterOutputs<AppRouter> (the
// usual output-typing rule) — naming that specific slice as a type alias
// hits TypeScript's instantiation depth limit (TS2589), apparently from
// AuditLogEntry's Json? columns combined with the AppRouter's own inference
// depth. The wire shape is unaffected: createdAt really is a string (no
// superjson transformer, same as every other date field in this app), and
// Json columns cross the wire as plain objects regardless of how they're
// typed here. useAuditLog itself stays a plain, untyped-alias pass-through
// (adding a `select` there re-triggers the same TS2589), and callers cast at
// the point they hand data to this component.
export interface AuditLogEntry {
  id: string
  action: string
  actorType: string
  actorUserId: string | null
  createdAt: string
}

const ACTION_ICONS: Record<string, LucideIcon> = {
  STATUS_CHANGED: ListChecks,
  EVIDENCE_UPLOADED: FileUp,
  GAP_DETECTED: ShieldAlert,
  GAP_RESOLVED: ShieldCheck,
  CHECKLIST_ITEMS_CREATED: CheckCircle2,
  TRIGGER_EVENT_RECEIVED: FileUp,
}

const ACTION_LABELS: Record<string, string> = {
  STATUS_CHANGED: 'Status changed',
  EVIDENCE_UPLOADED: 'Evidence uploaded',
  GAP_DETECTED: 'Gap detected',
  GAP_RESOLVED: 'Gap resolved',
  CHECKLIST_ITEMS_CREATED: 'Checklist item created',
  TRIGGER_EVENT_RECEIVED: 'Trigger event received',
}

function actorLabel(entry: AuditLogEntry): string {
  if (entry.actorType === 'SYSTEM_AGENT') return 'System'
  if (entry.actorType === 'SCHEDULED_JOB') return 'Scheduled job'
  return entry.actorUserId ?? 'User'
}

interface AuditTimelineProps {
  entries: AuditLogEntry[]
}

// Generic — takes entries as a prop so it can be reused wherever audit
// history needs to render, not just the checklist detail page.
export function AuditTimeline({ entries }: AuditTimelineProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Audit trail</CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <EmptyState title="No audit history" description="No recorded activity yet." />
        ) : (
          <ul className="space-y-4">
            {entries.map((entry) => {
              const Icon = ACTION_ICONS[entry.action] ?? ListChecks
              return (
                <li key={entry.id} className="flex gap-3">
                  <Icon className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">
                      {ACTION_LABELS[entry.action] ?? entry.action}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {actorLabel(entry)} · {formatDate(entry.createdAt)}
                    </p>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
