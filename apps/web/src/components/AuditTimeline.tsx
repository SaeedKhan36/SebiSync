import {
  CheckCircle2,
  FileUp,
  Fingerprint,
  ListChecks,
  ShieldAlert,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { EmptyState } from '#/components/EmptyState'
import { formatDate } from '#/lib/format'
import { cn } from '#/lib/utils'

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

// Marker color mirrors the semantic status colors used across badges and
// charts: detection = red, resolution = green, everything else = indigo.
const ACTION_DOT: Record<string, string> = {
  GAP_DETECTED: 'bg-[#b91c1c]',
  GAP_RESOLVED: 'bg-[#15803d]',
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
// history needs to render, not just the checklist detail page. Rendered as
// a railed timeline, matching the audit-trail identity from the landing page.
export function AuditTimeline({ entries }: AuditTimelineProps) {
  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[15px] font-semibold">
          <Fingerprint className="size-4 text-[#3730a3] dark:text-indigo-300" />
          Audit trail
        </CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <EmptyState title="No audit history" description="No recorded activity yet." />
        ) : (
          <ul>
            {entries.map((entry, i) => {
              const Icon = ACTION_ICONS[entry.action] ?? ListChecks
              return (
                <li key={entry.id} className="relative flex gap-3.5 pb-5 last:pb-0">
                  {i < entries.length - 1 && (
                    <span
                      aria-hidden
                      className="absolute top-4 left-[4.5px] h-full w-px bg-border"
                    />
                  )}
                  <span
                    aria-hidden
                    className={cn(
                      'relative z-10 mt-1.5 size-2.5 shrink-0 rounded-full',
                      ACTION_DOT[entry.action] ?? 'bg-[#4338ca]',
                    )}
                  />
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="flex items-center gap-1.5 text-sm font-medium">
                        <Icon className="size-3.5 text-muted-foreground" />
                        {ACTION_LABELS[entry.action] ?? entry.action}
                      </p>
                      <p className="shrink-0 text-xs text-muted-foreground tabular-nums">
                        {formatDate(entry.createdAt)}
                      </p>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{actorLabel(entry)}</p>
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
