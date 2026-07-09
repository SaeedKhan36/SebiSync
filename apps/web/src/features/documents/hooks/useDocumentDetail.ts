import { useQuery } from '@tanstack/react-query'
import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '@sebi/worker'
import { useTRPC } from '#/integrations/trpc/react'

export type DocumentDetail = inferRouterOutputs<AppRouter>['document']['get']

const POLLING_STATUSES = new Set(['PARSING', 'EXTRACTING'])

// First real use of the architecture's dynamic-polling rule: refetch every
// 3s while the ingestion pipeline is actively running (no push channel back
// to the frontend), stop once the document reaches a terminal status.
export function useDocumentDetail(id: string) {
  const trpc = useTRPC()
  return useQuery({
    ...trpc.document.get.queryOptions({ id }),
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status && POLLING_STATUSES.has(status) ? 3000 : false
    },
  })
}
