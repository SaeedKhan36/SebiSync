import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useTRPC } from '#/integrations/trpc/react'

export function useIntermediaryCategories() {
  const trpc = useTRPC()
  return useQuery(trpc.intermediary.listCategories.queryOptions())
}

export function useProvisionIntermediary() {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return useMutation(
    trpc.intermediary.provision.mutationOptions({
      onSuccess: async () => {
        // Re-run the _org layout's provisioning check (client.listByIntermediary)
        // so it now passes, then land on the dashboard.
        await queryClient.invalidateQueries(trpc.client.queryFilter())
        await navigate({ to: '/dashboard' })
      },
    }),
  )
}
