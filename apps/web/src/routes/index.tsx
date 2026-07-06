import { createFileRoute } from '@tanstack/react-router'
import { StatusBadge } from '#/components/status/StatusBadge'
import { GapSeverityBadge } from '#/components/status/GapSeverityBadge'
import {
  docStatusColorMap,
  obligationStatusColorMap,
  checklistStatusColorMap,
} from '#/components/status/statusColorMaps'
import { DataTable } from '#/components/data-table/DataTable'
import { EmptyState } from '#/components/EmptyState'
import { Inbox } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  const emptyColumns: ColumnDef<never>[] = [{ accessorKey: 'name', header: 'Name' }]

  return (
    <div className="space-y-8 p-8">
      <div>
        <h1 className="text-2xl font-bold">Phase 2 scratch verification</h1>
        <p className="text-muted-foreground text-sm">Temporary — reverted after screenshot.</p>
      </div>

      <div>
        <h2 className="mb-2 font-semibold">DocStatus</h2>
        <div className="flex gap-2">
          {(Object.keys(docStatusColorMap) as (keyof typeof docStatusColorMap)[]).map((v) => (
            <StatusBadge key={v} value={v} map={docStatusColorMap} />
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-2 font-semibold">ObligationStatus</h2>
        <div className="flex gap-2">
          {(Object.keys(obligationStatusColorMap) as (keyof typeof obligationStatusColorMap)[]).map(
            (v) => (
              <StatusBadge key={v} value={v} map={obligationStatusColorMap} />
            ),
          )}
        </div>
      </div>

      <div>
        <h2 className="mb-2 font-semibold">ChecklistStatus</h2>
        <div className="flex gap-2">
          {(Object.keys(checklistStatusColorMap) as (keyof typeof checklistStatusColorMap)[]).map(
            (v) => (
              <StatusBadge key={v} value={v} map={checklistStatusColorMap} />
            ),
          )}
        </div>
      </div>

      <div>
        <h2 className="mb-2 font-semibold">GapSeverity</h2>
        <div className="flex gap-2">
          <GapSeverityBadge severity="LOW" />
          <GapSeverityBadge severity="MEDIUM" />
          <GapSeverityBadge severity="HIGH" />
          <GapSeverityBadge severity="CRITICAL" />
        </div>
      </div>

      <div>
        <h2 className="mb-2 font-semibold">Empty DataTable</h2>
        <DataTable
          columns={emptyColumns}
          data={[]}
          emptyState={
            <EmptyState icon={Inbox} title="No rows" description="Empty state slot test." />
          }
        />
      </div>
    </div>
  )
}
