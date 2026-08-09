import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTRPC } from '#/integrations/trpc/react'

// Non-optimistic, same reasoning as usePublishObligation: the server may
// reject a mapping (the prior obligation already claimed, the draft no longer
// DRAFT), and guessing a decision about retiring a live compliance
// requirement is not a guess worth making. Only obligation.* needs
// invalidating — deciding a mapping changes no checklist item; that happens
// later, at publish.
export function useDecideSupersession() {
  const trpc = useTRPC()
  const queryClient = useQueryClient()

  return useMutation(
    trpc.obligation.decideSupersession.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries(trpc.obligation.pathFilter())
      },
    }),
  )
}
