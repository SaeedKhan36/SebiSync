import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTRPC } from '#/integrations/trpc/react'

// Invalidates the whole client path: listByIntermediary also backs the
// checklist client filter options and _org's provision check.
export function useCreateClient() {
  const trpc = useTRPC()
  const queryClient = useQueryClient()

  return useMutation(
    trpc.client.create.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries(trpc.client.pathFilter())
      },
    }),
  )
}

export function useUpdateClient() {
  const trpc = useTRPC()
  const queryClient = useQueryClient()

  return useMutation(
    trpc.client.update.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries(trpc.client.pathFilter())
      },
    }),
  )
}
