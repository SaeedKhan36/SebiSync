import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTRPC } from '#/integrations/trpc/react'

// Non-optimistic sibling of Phase 6's useUpdateChecklistStatus: that hook's
// optimistic patch is shaped for a list query's array cache entry, which
// doesn't match this single-object detail query. Invalidates broadly instead
// (getDetail exact key + the checklist router + dashboard.summary), per the
// architecture's cross-router invalidation map.
export function useUpdateChecklistStatusDetail(checklistItemId: string) {
  const trpc = useTRPC()
  const queryClient = useQueryClient()

  return useMutation(
    trpc.checklist.updateStatus.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries(
          trpc.checklist.getDetail.queryFilter({ id: checklistItemId }),
        )
        void queryClient.invalidateQueries(trpc.checklist.pathFilter())
        void queryClient.invalidateQueries(trpc.dashboard.summary.queryFilter())
      },
    }),
  )
}
