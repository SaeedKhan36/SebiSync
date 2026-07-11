import { useSuspenseQuery } from '@tanstack/react-query'
import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '@sebi/worker'
import { useTRPC } from '#/integrations/trpc/react'

export type ObligationDetail = inferRouterOutputs<AppRouter>['obligation']['get']

const POLLING_FAN_OUT_STATUSES = new Set(['PENDING', 'IN_PROGRESS'])

// Polls while checklist fan-out (a Trigger.dev task, triggered on publish)
// is still running — same dynamic-polling pattern as useDocumentDetail,
// stops once fanOutStatus reaches a terminal state (COMPLETED/FAILED) or the
// obligation was never published (fanOutStatus NONE).
export function useObligationDetail(id: string) {
  const trpc = useTRPC()
  return useSuspenseQuery({
    ...trpc.obligation.get.queryOptions({ id }),
    refetchInterval: (query) => {
      const fanOutStatus = query.state.data?.fanOutStatus
      return fanOutStatus && POLLING_FAN_OUT_STATUSES.has(fanOutStatus) ? 3000 : false
    },
  })
}
