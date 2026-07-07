import { useQuery } from '@tanstack/react-query'
import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '@sebi/worker'
import { useTRPC } from '#/integrations/trpc/react'

export type AuditLogEntry = inferRouterOutputs<AppRouter>['audit']['listByEntity'][number]

// Plain useQuery, not suspense — secondary data on the checklist detail page,
// per the architecture's suspense-vs-plain-query split.
export function useAuditLog(checklistItemId: string) {
  const trpc = useTRPC()
  return useQuery(trpc.audit.listByEntity.queryOptions({ checklistItemId }))
}
