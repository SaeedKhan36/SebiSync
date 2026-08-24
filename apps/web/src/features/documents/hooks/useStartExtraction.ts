import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTRPC } from '#/integrations/trpc/react'
import { uploadFileToPresignedUrl } from '#/lib/upload'

interface StartExtractionInput {
  documentId: string
  file?: File
}

// Composes getUploadUrl -> PUT (Phase 7's shared helper) -> triggerExtraction
// into one action. Unlike evidence, document.getUploadUrl already persists
// r2ObjectKey server-side, so there's no separate "confirm" step. `file` is
// optional when the PDF is already in object storage (uploaded from the
// create dialog).
export function useStartExtraction(documentId: string) {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const getUploadUrl = useMutation(trpc.document.getUploadUrl.mutationOptions())
  const triggerExtraction = useMutation(trpc.document.triggerExtraction.mutationOptions())

  return useMutation({
    mutationFn: async (input: StartExtractionInput) => {
      if (input.file) {
        const { uploadUrl } = await getUploadUrl.mutateAsync({
          documentId: input.documentId,
          fileName: input.file.name,
          contentType: input.file.type || 'application/pdf',
        })
        await uploadFileToPresignedUrl(uploadUrl, input.file)
      }
      return triggerExtraction.mutateAsync({ documentId: input.documentId })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries(trpc.document.get.queryFilter({ id: documentId }))
      void queryClient.invalidateQueries(trpc.document.pathFilter())
    },
  })
}
