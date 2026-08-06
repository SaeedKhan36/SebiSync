import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '#/components/ui/button'
import { Textarea } from '#/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '#/components/ui/dialog'
import { useBulkResolveGaps } from '#/features/gaps/hooks/useBulkResolveGaps'

interface BulkResolveGapsDialogProps {
  gapIds: string[]
  onDone: () => void
}

export function BulkResolveGapsDialog({ gapIds, onDone }: BulkResolveGapsDialogProps) {
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState('')
  const { resolveAll, isPending } = useBulkResolveGaps()

  async function handleSubmit() {
    const { succeeded, failed } = await resolveAll(gapIds, note)
    if (failed === 0) {
      toast.success(`Resolved ${succeeded} gap${succeeded === 1 ? '' : 's'}`)
    } else if (succeeded === 0) {
      toast.error(`Failed to resolve ${failed} gap${failed === 1 ? '' : 's'}`)
    } else {
      toast.warning(`Resolved ${succeeded}, failed ${failed}`)
    }
    setOpen(false)
    setNote('')
    onDone()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" disabled={gapIds.length === 0}>
          Resolve {gapIds.length} gap{gapIds.length === 1 ? '' : 's'}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Resolve {gapIds.length} gap{gapIds.length === 1 ? '' : 's'}</DialogTitle>
        </DialogHeader>
        <Textarea
          placeholder="Describe how these gaps were resolved"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={isPending || note.trim().length === 0}>
            {isPending ? 'Resolving…' : 'Mark resolved'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
