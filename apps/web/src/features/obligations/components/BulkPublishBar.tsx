import { toast } from 'sonner'
import { Button } from '#/components/ui/button'
import { useBulkPublishObligations } from '#/features/obligations/hooks/useBulkPublishObligations'

interface BulkPublishBarProps {
  ids: string[]
  onDone: () => void
}

export function BulkPublishBar({ ids, onDone }: BulkPublishBarProps) {
  const { publishAll, isPending } = useBulkPublishObligations()

  async function handleClick() {
    const { succeeded, failed } = await publishAll(ids)
    if (failed === 0) {
      toast.success(`Published ${succeeded} obligation${succeeded === 1 ? '' : 's'}`)
    } else if (succeeded === 0) {
      toast.error(`Failed to publish ${failed} obligation${failed === 1 ? '' : 's'}`)
    } else {
      toast.warning(`Published ${succeeded}, failed ${failed}`)
    }
    onDone()
  }

  return (
    <Button size="sm" disabled={isPending} onClick={handleClick}>
      {isPending ? 'Publishing…' : `Publish ${ids.length} obligation${ids.length === 1 ? '' : 's'}`}
    </Button>
  )
}
