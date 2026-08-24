import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useTRPC } from '#/integrations/trpc/react'

export function useProvisionIntermediary() {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return useMutation(
    trpc.intermediary.provision.mutationOptions({
      onSuccess: async () => {
        // Re-run the _org layout's provisioning check (client.listByIntermediary)
        // so it now passes, then land on the dashboard. Note: this installed
        // version of @trpc/tanstack-react-query renamed the router-level
        // invalidation helper to pathFilter() (queryFilter() is procedure-level
        // only) — differs from some published docs for slightly older versions.
        await queryClient.invalidateQueries(trpc.client.pathFilter())
        await navigate({ to: '/dashboard' })
      },
    }),
  )
}
