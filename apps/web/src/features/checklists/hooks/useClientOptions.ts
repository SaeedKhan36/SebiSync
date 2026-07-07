import { useQuery } from '@tanstack/react-query'
import { useTRPC } from '#/integrations/trpc/react'

// Secondary data for the client-filter dropdown — plain useQuery, not
// suspense, per the architecture doc's suspense-vs-plain-query split
// (primary page data suspends, secondary/filter data doesn't).
export function useClientOptions() {
  const trpc = useTRPC()
  return useQuery(trpc.client.listByIntermediary.queryOptions())
}
