import { FileCheck2 } from 'lucide-react'
import type { EvidenceType } from '@sebi/schemas'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { EmptyState } from '#/components/EmptyState'
import { evidenceTypeLabelMap } from '#/components/status/statusColorMaps'
import { formatDate } from '#/lib/format'
import type { ChecklistDetail } from '#/features/checklists/hooks/useChecklistDetail'

interface EvidenceListProps {
  evidenceRecords: ChecklistDetail['evidenceRecords']
  action?: React.ReactNode
}

export function EvidenceList({ evidenceRecords, action }: EvidenceListProps) {
  return (
    <Card className="gap-4">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-[15px] font-semibold">
          <FileCheck2 className="size-4 text-[#15803d]" />
          Evidence
        </CardTitle>
        {action}
      </CardHeader>
      <CardContent>
        {evidenceRecords.length === 0 ? (
          <EmptyState title="No evidence yet" description="Upload evidence to mark this item compliant." />
        ) : (
          <ul className="divide-y">
            {evidenceRecords.map((record) => (
              <li key={record.id} className="space-y-1 py-3 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">
                    {evidenceTypeLabelMap[record.evidenceType as EvidenceType]}
                  </p>
                  <p className="text-muted-foreground text-xs">{formatDate(record.submittedAt)}</p>
                </div>
                {record.description && <p className="text-sm">{record.description}</p>}
                <p className="text-muted-foreground text-xs">
                  {record.validUntil ? `Valid until ${formatDate(record.validUntil)}` : 'No expiry'}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
