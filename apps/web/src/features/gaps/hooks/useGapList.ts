import { useSuspenseQuery } from '@tanstack/react-query'
import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '@sebi/worker'
import type { GapSeverity } from '@sebi/schemas'
import { useTRPC } from '#/integrations/trpc/react'

// Real wire type via inferRouterOutputs, not @sebi/schemas's GapDto —
// detectedAt/resolvedAt cross the wire as strings, no transformer.
export type GapListItem = inferRouterOutputs<AppRouter>['gap']['list'][number]

export interface GapListFilters {
  severity?: GapSeverity
  resolved?: boolean
}

export function useGapList(filters: GapListFilters) {
  const trpc = useTRPC()
  return useSuspenseQuery(trpc.gap.list.queryOptions(filters))
}
