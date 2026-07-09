import { useSuspenseQuery } from '@tanstack/react-query'
import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '@sebi/worker'
import type { ObligationStatus } from '@sebi/schemas'
import { useTRPC } from '#/integrations/trpc/react'

export type ObligationListItem = inferRouterOutputs<AppRouter>['obligation']['list'][number]

export interface ObligationListFilters {
  documentId?: string
  status?: ObligationStatus
  categoryCode?: string
}

export function useObligationList(filters: ObligationListFilters) {
  const trpc = useTRPC()
  return useSuspenseQuery(trpc.obligation.list.queryOptions(filters))
}
