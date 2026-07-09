import { useSuspenseQuery } from '@tanstack/react-query'
import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '@sebi/worker'
import { useTRPC } from '#/integrations/trpc/react'

export type ObligationDetail = inferRouterOutputs<AppRouter>['obligation']['get']

export function useObligationDetail(id: string) {
  const trpc = useTRPC()
  return useSuspenseQuery(trpc.obligation.get.queryOptions({ id }))
}
