import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTRPC } from '#/integrations/trpc/react'
import type { ChecklistListFilters, ChecklistListItem } from './useChecklistList'

// Optimistic update scoped to the *currently active* filter combo's cache
// entry (not every cached variant via setQueriesData) — sufficient since
// this list has no server-side pagination yet (Table Strategy note: one
// cached "page" per filter combo at this scale). onSettled invalidates
// broadly regardless, so any staleness beyond the optimistic patch
// self-heals immediately.
export function useUpdateChecklistStatus(activeFilters: ChecklistListFilters) {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const queryKey = trpc.checklist.listByIntermediary.queryKey(activeFilters)

  return useMutation(
    trpc.checklist.updateStatus.mutationOptions({
      onMutate: async (variables) => {
        await queryClient.cancelQueries({ queryKey })
        const previous = queryClient.getQueryData<ChecklistListItem[]>(queryKey)
        queryClient.setQueryData<ChecklistListItem[]>(queryKey, (old) =>
          old?.map((item) =>
            item.id === variables.id ? { ...item, status: variables.status } : item,
          ),
        )
        return { previous }
      },
      onError: (_err, _variables, context) => {
        if (context?.previous) {
          queryClient.setQueryData(queryKey, context.previous)
        }
      },
      onSettled: () => {
        void queryClient.invalidateQueries(trpc.checklist.pathFilter())
        void queryClient.invalidateQueries(trpc.dashboard.summary.queryFilter())
      },
    }),
  )
}
