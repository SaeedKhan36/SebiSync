import { useSuspenseQuery } from '@tanstack/react-query'
import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '@sebi/worker'
import { useTRPC } from '#/integrations/trpc/react'

export type SupersessionProposal =
  inferRouterOutputs<AppRouter>['obligation']['supersessionProposals'][number]

export function useSupersessionProposals(filters?: { documentId?: string }) {
  const trpc = useTRPC()
  return useSuspenseQuery(trpc.obligation.supersessionProposals.queryOptions(filters))
}
