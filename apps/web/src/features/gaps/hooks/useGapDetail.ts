import { useSuspenseQuery } from '@tanstack/react-query'
import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '@sebi/worker'
import { useTRPC } from '#/integrations/trpc/react'

export type GapDetail = inferRouterOutputs<AppRouter>['gap']['get']

export function useGapDetail(id: string) {
  const trpc = useTRPC()
  return useSuspenseQuery(trpc.gap.get.queryOptions({ id }))
}
