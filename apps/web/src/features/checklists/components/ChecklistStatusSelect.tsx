import type { ChecklistStatus } from '@sebi/schemas'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { checklistStatusColorMap } from '#/components/status/statusColorMaps'
import { useUpdateChecklistStatus } from '#/features/checklists/hooks/useUpdateChecklistStatus'
import type { ChecklistListFilters } from '#/features/checklists/hooks/useChecklistList'

interface ChecklistStatusSelectProps {
  checklistItemId: string
  status: ChecklistStatus
  activeFilters: ChecklistListFilters
}

const STATUS_VALUES = Object.keys(checklistStatusColorMap) as ChecklistStatus[]

// Inline, no separate "save" step — changing the value fires the mutation
// immediately (instant feedback matters for daily workflow, per the
// architecture doc's optimistic-update guidance).
export function ChecklistStatusSelect({
  checklistItemId,
  status,
  activeFilters,
}: ChecklistStatusSelectProps) {
  const updateStatus = useUpdateChecklistStatus(activeFilters)

  return (
    <Select
      value={status}
      onValueChange={(next) =>
        updateStatus.mutate({ id: checklistItemId, status: next as ChecklistStatus })
      }
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
