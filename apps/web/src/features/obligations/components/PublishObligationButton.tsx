import { toast } from 'sonner'
import { Button } from '#/components/ui/button'
import { usePublishObligation } from '#/features/obligations/hooks/usePublishObligation'

export function PublishObligationButton({ obligationId }: { obligationId: string }) {
  const publish = usePublishObligation()

  return (
    <Button
      disabled={publish.isPending}
      onClick={() =>
        publish.mutate(
          { id: obligationId },
          {
            onSuccess: () => toast.success('Obligation published'),
            onError: (error) => toast.error(error.message),
          },
        )
      }
    >
      {publish.isPending ? 'Publishing...' : 'Publish'}
    </Button>
  )
}
