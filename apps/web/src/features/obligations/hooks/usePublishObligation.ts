import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTRPC } from '#/integrations/trpc/react'

// Non-optimistic per the architecture: obligation.publish triggers a real
// cross-tenant checklist fan-out server-side, so we show a pending state and
// wait for the real response rather than guessing the outcome. Invalidates
// obligation.list/get, checklist.listByIntermediary, and dashboard.summary —
// the trickiest cross-router invalidation case in the app.
export function usePublishObligation() {
  const trpc = useTRPC()
  const queryClient = useQueryClient()

  return useMutation(
    trpc.obligation.publish.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries(trpc.obligation.pathFilter())
        void queryClient.invalidateQueries(trpc.checklist.pathFilter())
        void queryClient.invalidateQueries(trpc.dashboard.summary.queryFilter())
      },
    }),
  )
}
