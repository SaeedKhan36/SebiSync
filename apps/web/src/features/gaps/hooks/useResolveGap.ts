import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTRPC } from '#/integrations/trpc/react'

// Non-optimistic: resolving is a deliberate, infrequent action with a
// required note, not a quick toggle (same reasoning as Phase 7's evidence
// upload). Per the architecture's cross-router invalidation map:
// gap.list, gap.get, checklist.getDetail, dashboard.summary.
export function useResolveGap(checklistItemId: string) {
  const trpc = useTRPC()
  const queryClient = useQueryClient()

  return useMutation(
    trpc.gap.resolve.mutationOptions({
      onSuccess: (gap) => {
        void queryClient.invalidateQueries(trpc.gap.pathFilter())
        void queryClient.invalidateQueries(trpc.gap.get.queryFilter({ id: gap.id }))
        void queryClient.invalidateQueries(
          trpc.checklist.getDetail.queryFilter({ id: checklistItemId }),
        )
        void queryClient.invalidateQueries(trpc.dashboard.summary.queryFilter())
      },
    }),
  )
}
