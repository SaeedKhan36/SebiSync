import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTRPC } from '#/integrations/trpc/react'

export function useRejectEvidence(checklistItemId: string) {
  const trpc = useTRPC()
  const queryClient = useQueryClient()

  return useMutation(
    trpc.checklist.reject.mutationOptions({
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
