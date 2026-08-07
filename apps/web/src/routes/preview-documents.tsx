// TEMPORARY verification harness — delete after screenshotting.
// Renders the real documents-page components outside the /_authenticated
// guard so they can be inspected without a Clerk session.
import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import type { DocStatus } from '@sebi/schemas'
import { PageHeader } from '#/components/layout/PageHeader'
import { Button } from '#/components/ui/button'
import { DocumentTable } from '#/features/documents/components/DocumentTable'
import { DocumentsPagination } from '#/features/documents/components/DocumentsPagination'
import { DocumentsToolbar } from '#/features/documents/components/DocumentsToolbar'
import type { DocumentListItem } from '#/features/documents/hooks/useDocumentList'

export const Route = createFileRoute('/preview-documents')({ component: PreviewDocuments })

const doc = (
  id: string,
  title: string,
  circularNumber: string,
  issued: string,
  status: DocStatus,
  sourceUrl = 'https://www.sebi.gov.in/',
): DocumentListItem => ({
  id,
  title,
  circularNumber,
  issuedDate: issued,
  sourceUrl,
  r2ObjectKey: `documents/${id}/file.pdf`,
  status,
  lastIngestionRunId: null,
  supersedesId: null,
  createdAt: '2026-07-28T09:00:00.000Z',
})

const rows: DocumentListItem[] = [
  doc('1', 'Test Circular', 'TEST-001', '2026-07-10T00:00:00.000Z', 'EXTRACTED'),
  doc('2', 'Mock SEBI Compliance Demo Circular', 'MOCK-DEMO-2026-01', '2026-01-01T00:00:00.000Z', 'EXTRACTED'),
  doc('3', 'Master Circular for Investment Advisers', 'SEBI/HO/MIRSD-PoD-1/P/CIR/2024/50', '2024-05-21T00:00:00.000Z', 'PARSING'),
  doc('4', 'Framework for Adoption of Cloud Services by SEBI Regulated Entities and Intermediaries', 'SEBI/HO/ITD/ITD_VAPT/P/CIR/2023/033', '2023-03-06T00:00:00.000Z', 'FAILED', ''),
  doc('5', 'Master Circular for Mutual Funds', 'SEBI/HO/IMD/IMD-PoD-1/P/CIR/2024/90', '2024-06-27T00:00:00.000Z', 'UPLOADED'),
  doc('6', 'Guidelines for Business Continuity Plan and Disaster Recovery', 'SEBI/HO/MRD/MRD-PoD-3/P/CIR/2024/12', '2024-02-14T00:00:00.000Z', 'EXTRACTING'),
  doc('7', 'Modification in Cyber Security and Cyber Resilience Framework', 'SEBI/HO/MIRSD/CIR/P/2023/107', '2023-06-30T00:00:00.000Z', 'PARSED'),
]

function PreviewDocuments() {
  const [searchInput, setSearchInput] = useState('')
  const [status, setStatus] = useState<DocStatus | undefined>()
  const [empty, setEmpty] = useState(false)

  const filtered = empty
    ? []
    : rows.filter(
        (r) =>
          (!status || r.status === status) &&
          (searchInput === '' ||
            `${r.title} ${r.circularNumber}`.toLowerCase().includes(searchInput.toLowerCase())),
      )
  const isFiltered = searchInput !== '' || status !== undefined

  function clear() {
    setSearchInput('')
    setStatus(undefined)
    setEmpty(false)
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <PageHeader
          title="Documents"
          description="SEBI circulars and master circulars ingested into the extraction pipeline."
          action={<Button>Upload document</Button>}
        />
        <DocumentTable
          items={filtered}
          isFiltered={isFiltered || empty}
          onClearFilters={clear}
          onRowClick={() => {}}
          toolbar={
            <DocumentsToolbar
              searchInput={searchInput}
              onSearchInputChange={setSearchInput}
              status={status}
              onStatusChange={setStatus}
              isFiltered={isFiltered}
              onClearFilters={clear}
            />
          }
          footer={
            <DocumentsPagination
              count={filtered.length}
              pageIndex={0}
              hasPreviousPage={false}
              hasNextPage
              onPrevious={() => {}}
              onNext={() => {}}
            />
          }
        />
        <Button variant="outline" size="sm" onClick={() => setEmpty((v) => !v)}>
          Toggle empty state
        </Button>
      </div>
    </div>
  )
}
