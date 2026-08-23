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
import { useIsOrgAdmin } from '#/features/auth/hooks/useIsOrgAdmin'
import { useApproveEvidence } from '#/features/checklists/hooks/useApproveEvidence'
import { useRejectEvidence } from '#/features/checklists/hooks/useRejectEvidence'
import type { ChecklistDetail } from '#/features/checklists/hooks/useChecklistDetail'

export function ReviewEvidenceActions({ item }: { item: ChecklistDetail }) {
  const isAdmin = useIsOrgAdmin()
  const approve = useApproveEvidence(item.id)
  const reject = useRejectEvidence(item.id)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [reason, setReason] = useState('')

  if (!isAdmin || item.status !== 'PENDING_REVIEW') return null

  const busy = approve.isPending || reject.isPending

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        disabled={busy}
        onClick={() =>
          approve.mutate(
            { id: item.id },
            {
              onSuccess: () => toast.success('Evidence approved'),
              onError: (error) => toast.error(error.message),
            },
          )
        }
      >
        {approve.isPending ? 'Approving...' : 'Approve'}
      </Button>
      <Dialog
        open={rejectOpen}
        onOpenChange={(open) => {
          setRejectOpen(open)
          if (!open) setReason('')
        }}
      >
        <DialogTrigger asChild>
          <Button size="sm" variant="outline" disabled={busy}>
            Reject
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject evidence</DialogTitle>
          </DialogHeader>
          <Textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Why is this evidence insufficient?"
          />
          <DialogFooter>
            <Button
              variant="destructive"
              disabled={busy || reason.trim().length === 0}
              onClick={() =>
                reject.mutate(
                  { id: item.id, reason: reason.trim() },
                  {
                    onSuccess: () => {
                      toast.success('Evidence rejected')
                      setRejectOpen(false)
                      setReason('')
                    },
                    onError: (error) => toast.error(error.message),
                  },
                )
              }
            >
              {reject.isPending ? 'Rejecting...' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
