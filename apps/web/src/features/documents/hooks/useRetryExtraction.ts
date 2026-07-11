import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTRPC } from '#/integrations/trpc/react'

// Re-triggers ingestion for a FAILED document via document.retryExtraction —
// the backend uses a fresh timestamped idempotency key so this genuinely
// re-runs rather than being deduped against the original failed attempt.
export function useRetryExtraction(documentId: string) {
  const trpc = useTRPC()
  const queryClient = useQueryClient()

  return useMutation(
    trpc.document.retryExtraction.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries(trpc.document.get.queryFilter({ id: documentId }))
        void queryClient.invalidateQueries(trpc.document.pathFilter())
      },
    }),
  )
}
