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
  //
  // The `outline` variant is transparent, so its text sits directly on the
  // page surface and needs a dark: counterpart — the -700 shades measure
  // 3.8:1 and 4.0:1 on the dark background, both below the 4.5:1 AA floor
  // for this 12px text. The -400 shades clear it comfortably.
  className?: string
}

export const docStatusColorMap: Record<DocStatus, StatusEntry> = {
  UPLOADED: { label: 'Uploaded', variant: 'secondary' },
  PARSING: { label: 'Parsing', variant: 'default', className: 'bg-[#4338ca] hover:bg-[#4338ca]/90' },
  EXTRACTING: {
    label: 'Extracting',
    variant: 'default',
    className: 'bg-[#4338ca] hover:bg-[#4338ca]/90',
  },
  PARSED: {
    label: 'Parsed',
    variant: 'default',
    className: 'bg-[#3730a3] hover:bg-[#3730a3]/90',
  },
  EXTRACTED: {
    label: 'Extracted',
    variant: 'default',
    className: 'bg-[#15803d] hover:bg-[#15803d]/90',
  },
  FAILED: { label: 'Failed', variant: 'destructive' },
}

export const obligationStatusColorMap: Record<ObligationStatus, StatusEntry> = {
  DRAFT: { label: 'Draft', variant: 'outline', className: 'border-amber-500 text-amber-700 dark:text-amber-400' },
  REVIEWED: { label: 'Reviewed', variant: 'secondary' },
  PUBLISHED: {
    label: 'Published',
    variant: 'default',
    className: 'bg-[#15803d] hover:bg-[#15803d]/90',
  },
  SUPERSEDED: { label: 'Superseded', variant: 'secondary' },
}

export const checklistStatusColorMap: Record<ChecklistStatus, StatusEntry> = {
  PENDING: { label: 'Pending', variant: 'secondary' },
  IN_PROGRESS: {
    label: 'In Progress',
    variant: 'default',
    className: 'bg-[#4338ca] hover:bg-[#4338ca]/90',
  },
  COMPLIANT: {
    label: 'Compliant',
    variant: 'default',
    className: 'bg-[#15803d] hover:bg-[#15803d]/90',
  },
  GAP: { label: 'Gap', variant: 'destructive' },
  NOT_APPLICABLE: { label: 'N/A', variant: 'outline' },
}

export const gapSeverityColorMap: Record<GapSeverity, StatusEntry> = {
  LOW: { label: 'Low', variant: 'secondary' },
  MEDIUM: { label: 'Medium', variant: 'outline', className: 'border-amber-500 text-amber-700 dark:text-amber-400' },
  HIGH: { label: 'High', variant: 'outline', className: 'border-orange-500 text-orange-700 dark:text-orange-400' },
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

// Extraction confidence (Obligation.extractionConfidence, 0-1) isn't an
// enum, so it can't be a Record like the other maps — this buckets the
// continuous value into the same StatusEntry shape via thresholds. Tunable:
// picked as a reasonable "flag for human review" cutoff, not measured
// against the real extraction pipeline's confidence distribution yet.
export function confidenceBucket(value: number): StatusEntry {
  if (value < 0.7) return { label: 'Low', variant: 'outline', className: 'border-amber-500 text-amber-700 dark:text-amber-400' }
  if (value >= 0.9) return { label: 'High', variant: 'default', className: 'bg-[#15803d] hover:bg-[#15803d]/90' }
  return { label: 'Medium', variant: 'secondary' }
}

export const obligationFanOutStatusColorMap: Record<ObligationFanOutStatus, StatusEntry> = {
  NONE: { label: 'Not published', variant: 'secondary' },
  PENDING: { label: 'Fan-out queued', variant: 'outline', className: 'border-amber-500 text-amber-700 dark:text-amber-400' },
  IN_PROGRESS: {
    label: 'Propagating…',
    variant: 'default',
    className: 'bg-[#4338ca] hover:bg-[#4338ca]/90',
  },
  COMPLETED: {
    label: 'Propagated',
    variant: 'default',
    className: 'bg-[#15803d] hover:bg-[#15803d]/90',
  },
  FAILED: { label: 'Fan-out failed', variant: 'destructive' },
}
