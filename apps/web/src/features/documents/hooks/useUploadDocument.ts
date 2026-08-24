import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { CreateDocument } from '@sebi/schemas'
import { useTRPC } from '#/integrations/trpc/react'
import { uploadFileToPresignedUrl } from '#/lib/upload'

interface UploadDocumentInput extends CreateDocument {
  file: File
}

// Create metadata, PUT the PDF to the presigned URL, then kick off extraction
// so the dialog is a single "upload document" action instead of a two-step
// create-then-upload-on-the-detail-page flow.
export function useUploadDocument() {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const create = useMutation(trpc.document.create.mutationOptions())
  const getUploadUrl = useMutation(trpc.document.getUploadUrl.mutationOptions())
  const triggerExtraction = useMutation(trpc.document.triggerExtraction.mutationOptions())

  return useMutation({
    mutationFn: async (input: UploadDocumentInput) => {
      const document = await create.mutateAsync({
        title: input.title,
        circularNumber: input.circularNumber,
        issuedDate: input.issuedDate,
        sourceUrl: input.sourceUrl || '',
        supersedesId: input.supersedesId,
      })
      const { uploadUrl } = await getUploadUrl.mutateAsync({
        documentId: document.id,
        fileName: input.file.name,
        contentType: input.file.type || 'application/pdf',
      })
      await uploadFileToPresignedUrl(uploadUrl, input.file)
      await triggerExtraction.mutateAsync({ documentId: document.id })
      return document
    },
    onSuccess: () => {
      void queryClient.invalidateQueries(trpc.document.pathFilter())
    },
  })
}
