import { useSuspenseQuery } from '@tanstack/react-query'
import type { inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '@sebi/worker'
import { useTRPC } from '#/integrations/trpc/react'

// The real wire type, not @sebi/schemas's dashboardSummarySchema — that
// schema uses z.coerce.date() for dueDate (output type Date), but it's
// never applied as an .output() validator on the router, and our tRPC setup
// has no superjson transformer, so dueDate actually crosses the wire as a
// JSON string. inferRouterOutputs reflects what's really received, which is
// what every consumer of this hook should type against.
export type DashboardSummaryData = inferRouterOutputs<AppRouter>['dashboard']['summary']

export function useDashboardSummary() {
  const trpc = useTRPC()
  return useSuspenseQuery(trpc.dashboard.summary.queryOptions())
}
