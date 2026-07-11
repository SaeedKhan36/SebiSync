import type {
  ChecklistStatus,
  DocStatus,
  EvidenceType,
  GapSeverity,
  GapType,
  ObligationStatus,
} from '@sebi/schemas'

export type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline'

export interface StatusEntry {
  label: string
  variant: BadgeVariant
  // Extra Tailwind classes layered on top of the base variant, for cases
  // where the 4 built-in shadcn variants aren't expressive enough (e.g.
  // distinguishing MEDIUM from HIGH severity, both of which need to read as
  // "not yet destructive but not calm either").
  className?: string
}

export const docStatusColorMap: Record<DocStatus, StatusEntry> = {
  UPLOADED: { label: 'Uploaded', variant: 'secondary' },
  PARSING: { label: 'Parsing', variant: 'default', className: 'bg-blue-600 hover:bg-blue-600/90' },
  EXTRACTING: {
    label: 'Extracting',
    variant: 'default',
    className: 'bg-blue-600 hover:bg-blue-600/90',
  },
  PARSED: {
    label: 'Parsed',
    variant: 'default',
    className: 'bg-indigo-600 hover:bg-indigo-600/90',
  },
  EXTRACTED: {
    label: 'Extracted',
    variant: 'default',
    className: 'bg-emerald-600 hover:bg-emerald-600/90',
  },
  FAILED: { label: 'Failed', variant: 'destructive' },
}

export const obligationStatusColorMap: Record<ObligationStatus, StatusEntry> = {
  DRAFT: { label: 'Draft', variant: 'outline', className: 'border-amber-500 text-amber-700' },
  REVIEWED: { label: 'Reviewed', variant: 'secondary' },
  PUBLISHED: {
    label: 'Published',
    variant: 'default',
    className: 'bg-emerald-600 hover:bg-emerald-600/90',
  },
  SUPERSEDED: { label: 'Superseded', variant: 'secondary' },
}

export const checklistStatusColorMap: Record<ChecklistStatus, StatusEntry> = {
  PENDING: { label: 'Pending', variant: 'secondary' },
  IN_PROGRESS: {
    label: 'In Progress',
    variant: 'default',
    className: 'bg-blue-600 hover:bg-blue-600/90',
  },
  COMPLIANT: {
    label: 'Compliant',
    variant: 'default',
    className: 'bg-emerald-600 hover:bg-emerald-600/90',
  },
  GAP: { label: 'Gap', variant: 'destructive' },
  NOT_APPLICABLE: { label: 'N/A', variant: 'outline' },
}

export const gapSeverityColorMap: Record<GapSeverity, StatusEntry> = {
  LOW: { label: 'Low', variant: 'secondary' },
  MEDIUM: { label: 'Medium', variant: 'outline', className: 'border-amber-500 text-amber-700' },
  HIGH: { label: 'High', variant: 'outline', className: 'border-orange-500 text-orange-700' },
  CRITICAL: { label: 'Critical', variant: 'destructive' },
}

// GapType is a category, not a status — rendered as a plain label, never a
// colored badge, so it doesn't compete visually with severity.
export const gapTypeLabelMap: Record<GapType, string> = {
  MISSING_EVIDENCE: 'Missing evidence',
  PAST_DEADLINE: 'Past deadline',
  STALE_EVIDENCE: 'Stale evidence',
  INCOMPLETE: 'Incomplete',
}

// EvidenceType is a category, not a status — plain label, same treatment as GapType.
export const evidenceTypeLabelMap: Record<EvidenceType, string> = {
  DOCUMENT: 'Document',
  FORM_SUBMISSION: 'Form submission',
  LOG_ENTRY: 'Log entry',
  ATTESTATION: 'Attestation',
}

// Recharts needs real color values (SVG fill), not Tailwind class strings —
// these hex values are chosen to match the same semantic colors used by the
// StatusBadge classNames above, so charts and badges stay visually
// consistent by construction rather than by coincidence.
export const checklistStatusChartColorMap: Record<ChecklistStatus, string> = {
  PENDING: '#94a3b8', // slate-400, matches secondary
  IN_PROGRESS: '#2563eb', // blue-600
  COMPLIANT: '#059669', // emerald-600
  GAP: '#dc2626', // red-600, matches destructive
  NOT_APPLICABLE: '#cbd5e1', // slate-300, matches outline/muted
}

export const gapSeverityChartColorMap: Record<GapSeverity, string> = {
  LOW: '#94a3b8', // slate-400
  MEDIUM: '#f59e0b', // amber-500
  HIGH: '#f97316', // orange-500
  CRITICAL: '#dc2626', // red-600
}

// Hand-written literal union rather than imported from @sebi/schemas — this
// enum (Obligation.fanOutStatus) has no Zod schema there since it's a
// server-derived read value, never a mutation input. Mirrors the Prisma
// enum ObligationFanOutStatus directly, same reasoning as AuditLogEntry's
// hand-written type in Phase 7 (simple enough to safely hand-mirror without
// importing Prisma types into the frontend).
export type ObligationFanOutStatus = 'NONE' | 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED'

export const obligationFanOutStatusColorMap: Record<ObligationFanOutStatus, StatusEntry> = {
  NONE: { label: 'Not published', variant: 'secondary' },
  PENDING: { label: 'Fan-out queued', variant: 'outline', className: 'border-amber-500 text-amber-700' },
  IN_PROGRESS: {
    label: 'Propagating…',
    variant: 'default',
    className: 'bg-blue-600 hover:bg-blue-600/90',
  },
  COMPLETED: {
    label: 'Propagated',
    variant: 'default',
    className: 'bg-emerald-600 hover:bg-emerald-600/90',
  },
  FAILED: { label: 'Fan-out failed', variant: 'destructive' },
}
