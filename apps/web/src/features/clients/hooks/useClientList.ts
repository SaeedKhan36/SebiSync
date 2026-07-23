import { useSuspenseQuery } from '@tanstack/react-query'
import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '@sebi/worker'
import { useTRPC } from '#/integrations/trpc/react'

export type ClientListItem = inferRouterOutputs<AppRouter>['client']['listByIntermediary'][number]

export function useClientList() {
  const trpc = useTRPC()
  return useSuspenseQuery(trpc.client.listByIntermediary.queryOptions())
}
