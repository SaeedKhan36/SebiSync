import { useSuspenseQuery } from '@tanstack/react-query'
import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '@sebi/worker'
import type { ChecklistStatus } from '@sebi/schemas'
import { useTRPC } from '#/integrations/trpc/react'

// Per the Phase 5 rule: real wire type via inferRouterOutputs, not
// @sebi/schemas's ChecklistItemDto (dueDate/lastEvidenceAt/createdAt/
// updatedAt cross the wire as strings, no transformer).
export type ChecklistListItem =
  inferRouterOutputs<AppRouter>['checklist']['listByIntermediary'][number]

export interface ChecklistListFilters {
  status?: ChecklistStatus
  clientId?: string
}

export function useChecklistList(filters: ChecklistListFilters) {
  const trpc = useTRPC()
  return useSuspenseQuery(trpc.checklist.listByIntermediary.queryOptions(filters))
}
