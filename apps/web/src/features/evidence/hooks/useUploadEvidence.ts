import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { EvidenceType } from '@sebi/schemas'
import { useTRPC } from '#/integrations/trpc/react'
import { uploadFileToPresignedUrl } from '#/lib/upload'

interface UploadEvidenceInput {
  checklistItemId: string
  file: File
  evidenceType: EvidenceType
  description?: string
  validUntil?: Date
}

// Composes the 3-step presigned-upload pattern (getUploadUrl -> PUT -> confirmUpload)
// into one mutation. On success, invalidates checklist.getDetail (refreshes
// the embedded evidenceRecords + flips status), checklist.listByIntermediary,
// and dashboard.summary — per the architecture's cross-router invalidation
// map. Non-optimistic: a file upload isn't an instant/low-risk action.
export function useUploadEvidence(checklistItemId: string) {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const getUploadUrl = useMutation(trpc.evidence.getUploadUrl.mutationOptions())
  const confirmUpload = useMutation(trpc.evidence.confirmUpload.mutationOptions())

  const mutation = useMutation({
    mutationFn: async (input: UploadEvidenceInput) => {
      const { uploadUrl, r2ObjectKey } = await getUploadUrl.mutateAsync({
        checklistItemId: input.checklistItemId,
        fileName: input.file.name,
        contentType: input.file.type,
      })
      await uploadFileToPresignedUrl(uploadUrl, input.file)
      return confirmUpload.mutateAsync({
        checklistItemId: input.checklistItemId,
        r2ObjectKey,
        evidenceType: input.evidenceType,
        description: input.description,
        validUntil: input.validUntil,
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries(
        trpc.checklist.getDetail.queryFilter({ id: checklistItemId }),
      )
      void queryClient.invalidateQueries(trpc.checklist.pathFilter())
      void queryClient.invalidateQueries(trpc.dashboard.summary.queryFilter())
      // The upload writes an EVIDENCE_UPLOADED audit entry, so the detail
      // page's timeline is stale until this key is refetched too.
      void queryClient.invalidateQueries(
        trpc.audit.listByEntity.queryFilter({ checklistItemId }),
      )
    },
  })

  return mutation
}
