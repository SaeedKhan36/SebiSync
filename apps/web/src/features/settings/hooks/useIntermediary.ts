import { useSuspenseQuery } from '@tanstack/react-query'
import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '@sebi/worker'
import { useTRPC } from '#/integrations/trpc/react'

export type IntermediaryDetail = inferRouterOutputs<AppRouter>['intermediary']['getCurrent']

export function useIntermediary() {
  const trpc = useTRPC()
  return useSuspenseQuery(trpc.intermediary.getCurrent.queryOptions())
}
