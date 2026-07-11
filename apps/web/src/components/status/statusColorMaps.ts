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
// Palette validated with the dataviz six-checks validator on the white card
// surface (lightness band, chroma floor, CVD adjacent-pair ΔE, 3:1 contrast).
// The two neutrals (PENDING/N-A) carry "no state yet" semantics and get their
// relief from the labeled legend + 2px slice spacers, per the status-color rule.
export const checklistStatusChartColorMap: Record<ChecklistStatus, string> = {
  PENDING: '#b45309', // amber-700 — waiting, needs action
  IN_PROGRESS: '#4338ca', // indigo-700 — brand working color
  COMPLIANT: '#15803d', // green-700 — good
  GAP: '#b91c1c', // red-700 — matches destructive
  NOT_APPLICABLE: '#d6d3d1', // stone-300 — deliberately recessive neutral
}

// Severity is ordered magnitude, so the chart uses a single-hue red ordinal
// ramp (validated: monotone lightness, ≥0.06 ΔL steps, light end ≥2:1) —
// identity comes from the labeled x-axis, color carries only "how bad".
export const gapSeverityChartColorMap: Record<GapSeverity, string> = {
  LOW: '#f87171', // red-400
  MEDIUM: '#dc2626', // red-600
  HIGH: '#b91c1c', // red-700
  CRITICAL: '#7f1d1d', // red-900
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
