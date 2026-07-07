import type { ChecklistStatus } from '@sebi/schemas'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { checklistStatusColorMap } from '#/components/status/statusColorMaps'

interface ChecklistStatusSelectProps {
  status: ChecklistStatus
  onStatusChange: (status: ChecklistStatus) => void
  disabled?: boolean
}

const STATUS_VALUES = Object.keys(checklistStatusColorMap) as ChecklistStatus[]

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
        {STATUS_VALUES.map((value) => (
          <SelectItem key={value} value={value}>
            {checklistStatusColorMap[value].label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
