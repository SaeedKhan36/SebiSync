import type { ChecklistStatus } from '@sebi/schemas'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { checklistStatusColorMap } from '#/components/status/statusColorMaps'
import { StatusBadge } from '#/components/status/StatusBadge'
import { useIsOrgAdmin } from '#/features/auth/hooks/useIsOrgAdmin'

interface ChecklistStatusSelectProps {
  status: ChecklistStatus
  onStatusChange: (status: ChecklistStatus) => void
  disabled?: boolean
}

const LOCKED_STATUSES = new Set<ChecklistStatus>(['PENDING_REVIEW', 'COMPLIANT'])

// Prop-driven mutation, not a hook call inside this component — the list
// page (Phase 6) and the detail page (Phase 7) each need a different
// invalidation strategy (optimistic list patch vs. plain broad invalidate),
// so they each own their own mutation hook and just pass the callback down.
// Inline, no separate "save" step — changing the value fires immediately
// (instant feedback matters for daily workflow, per the architecture doc).
export function ChecklistStatusSelect({
  status,
  onStatusChange,
  disabled,
}: ChecklistStatusSelectProps) {
  const isAdmin = useIsOrgAdmin()
  const locked = LOCKED_STATUSES.has(status) || (status === 'NOT_APPLICABLE' && !isAdmin)

  if (locked) {
    return <StatusBadge value={status} map={checklistStatusColorMap} />
  }

  const options = (Object.keys(checklistStatusColorMap) as ChecklistStatus[]).filter((value) => {
    if (value === 'COMPLIANT' || value === 'PENDING_REVIEW') return false
    if (value === 'NOT_APPLICABLE' && !isAdmin) return false
    return true
  })

  return (
    <Select
      value={status}
      onValueChange={(next) => onStatusChange(next as ChecklistStatus)}
      disabled={disabled}
    >
      <SelectTrigger size="sm" className="w-36" onClick={(e) => e.stopPropagation()}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent onClick={(e) => e.stopPropagation()}>
        {options.map((value) => (
          <SelectItem key={value} value={value}>
            {checklistStatusColorMap[value].label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
