import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTRPC } from '#/integrations/trpc/react'

// Loops the existing single-id publish mutation rather than adding a server
// bulk procedure — each id still goes through adminProcedure gating, its own
// audit entry, and its own fan-out trigger, exactly as a series of individual
// publishes would. Promise.allSettled so one failure (e.g. a non-DRAFT
// obligation someone else just published) doesn't block the rest.
export function useBulkPublishObligations() {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const publish = useMutation(trpc.obligation.publish.mutationOptions())

  async function publishAll(ids: string[]): Promise<{ succeeded: number; failed: number }> {
    const results = await Promise.allSettled(ids.map((id) => publish.mutateAsync({ id })))
    const succeeded = results.filter((r) => r.status === 'fulfilled').length
    const failed = results.length - succeeded

    void queryClient.invalidateQueries(trpc.obligation.pathFilter())
    void queryClient.invalidateQueries(trpc.checklist.pathFilter())
    void queryClient.invalidateQueries(trpc.dashboard.summary.queryFilter())

    return { succeeded, failed }
  }

  return { publishAll, isPending: publish.isPending }
}
