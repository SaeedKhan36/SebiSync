import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import type { DocStatus } from '@sebi/schemas'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { StatusBadge } from '#/components/status/StatusBadge'
import { docStatusColorMap } from '#/components/status/statusColorMaps'
import { useStartExtraction } from '#/features/documents/hooks/useStartExtraction'

const STATUS_COPY: Partial<Record<DocStatus, string>> = {
  PARSING: 'Parsing document with Docling...',
  EXTRACTING: 'Extracting obligations with the LLM agent...',
}

interface ExtractionProgressProps {
  documentId: string
  status: DocStatus
  hasFile: boolean
}

// Handles all three UPLOADED-status sub-states in one component: no file
// yet (picker), file ready to trigger, and PARSING/EXTRACTING in-flight
// (indeterminate progress, polled by the parent via useDocumentDetail).
export function ExtractionProgress({ documentId, status, hasFile }: ExtractionProgressProps) {
  const [file, setFile] = useState<File | null>(null)
  const startExtraction = useStartExtraction(documentId)

  if (status === 'PARSING' || status === 'EXTRACTING') {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 py-6">
          <Loader2 className="text-muted-foreground size-5 animate-spin" />
          <div>
            <p className="text-sm font-medium">{STATUS_COPY[status]}</p>
            <StatusBadge value={status} map={docStatusColorMap} className="mt-1" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (status !== 'UPLOADED') return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {hasFile ? 'Start extraction' : 'Upload the source file'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        {startExtraction.isError && (
          <p className="text-destructive text-sm">{startExtraction.error.message}</p>
        )}
        <Button
          disabled={!file || startExtraction.isPending}
          onClick={() => file && startExtraction.mutate({ documentId, file })}
        >
          {startExtraction.isPending ? 'Uploading...' : 'Upload & start extraction'}
        </Button>
      </CardContent>
    </Card>
  )
}
