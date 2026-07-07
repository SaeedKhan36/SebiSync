import { useSuspenseQuery } from '@tanstack/react-query'
import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '@sebi/worker'
import { useTRPC } from '#/integrations/trpc/react'

export type ChecklistDetail = inferRouterOutputs<AppRouter>['checklist']['getDetail']

export function useChecklistDetail(id: string) {
  const trpc = useTRPC()
  return useSuspenseQuery(trpc.checklist.getDetail.queryOptions({ id }))
}
