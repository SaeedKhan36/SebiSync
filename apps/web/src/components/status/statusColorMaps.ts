import type {
  ChecklistStatus,
  DocStatus,
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
