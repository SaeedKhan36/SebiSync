import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTRPC } from '#/integrations/trpc/react'

// Loops the existing single-gap resolve mutation with one shared note rather
// than adding a server bulk procedure — each gap still gets its own audit
// entry. Promise.allSettled so one failure doesn't block the rest.
// checklist.getDetail invalidation is per-checklist-item (see useResolveGap);
// with multiple gaps possibly spanning multiple checklist items, this
// invalidates the broader checklist.pathFilter() instead.
export function useBulkResolveGaps() {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const resolve = useMutation(trpc.gap.resolve.mutationOptions())

  async function resolveAll(
    gapIds: string[],
    resolutionNote: string,
  ): Promise<{ succeeded: number; failed: number }> {
    const results = await Promise.allSettled(
      gapIds.map((gapId) => resolve.mutateAsync({ gapId, resolutionNote })),
    )
    const succeeded = results.filter((r) => r.status === 'fulfilled').length
    const failed = results.length - succeeded

    void queryClient.invalidateQueries(trpc.gap.pathFilter())
    void queryClient.invalidateQueries(trpc.checklist.pathFilter())
    void queryClient.invalidateQueries(trpc.dashboard.summary.queryFilter())

    return { succeeded, failed }
  }

  return { resolveAll, isPending: resolve.isPending }
}
