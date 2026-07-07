import { useQuery } from '@tanstack/react-query'
import { useTRPC } from '#/integrations/trpc/react'

export function useAuditLog(checklistItemId: string) {
  const trpc = useTRPC()
  return useQuery(trpc.audit.listByEntity.queryOptions({ checklistItemId }))
}
