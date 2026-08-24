import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { useTRPC } from '#/integrations/trpc/react'

export function useIntermediaryCategories() {
  const trpc = useTRPC()
  return useQuery(trpc.intermediary.listCategories.queryOptions())
}

// Suspense variant for routes that prefetch the list in their loader and have
// a pendingComponent — the data is guaranteed present, so callers get a plain
// array instead of having to narrow `data` on every read.
export function useIntermediaryCategoriesSuspense() {
  const trpc = useTRPC()
  return useSuspenseQuery(trpc.intermediary.listCategories.queryOptions())
}
