import { Link } from '@tanstack/react-router'
import { FileUp, ScanLine, UserPlus } from 'lucide-react'
import type { DashboardSummaryData } from '#/features/dashboard/hooks/useDashboardSummary'
import { Card } from '#/components/ui/card'
import { Button } from '#/components/ui/button'
import { obligationStatusColorMap } from '#/components/status/statusColorMaps'
import type { ObligationStatus } from '@sebi/schemas'

interface RegisterStripProps {
  data: DashboardSummaryData['obligationsByStatus']
}

// Live register first, then the review pipeline, then the archive — the
// order a compliance officer actually cares about.
const STATUS_ORDER: ObligationStatus[] = ['PUBLISHED', 'REVIEWED', 'DRAFT', 'SUPERSEDED']

export function RegisterStrip({ data }: RegisterStripProps) {
  const byStatus = new Map(data.map((entry) => [entry.status, entry.count]))
  const chips = STATUS_ORDER.map((status) => ({
    status,
    label: obligationStatusColorMap[status].label,
    value: byStatus.get(status) ?? 0,
  })).filter((chip) => chip.value > 0)

  return (
    <Card className="flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="text-[15px] font-semibold text-foreground">Obligation register</span>
        {chips.length === 0 ? (
          <span className="text-sm text-muted-foreground">No obligations extracted yet.</span>
        ) : (
          <span className="flex flex-wrap items-center gap-1.5">
            {chips.map((chip) => (
              <Link
                key={chip.status}
                to="/obligations"
                search={{ status: chip.status }}
                className="rounded-md border border-border bg-background px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
              >
                <span className="font-semibold text-foreground tabular-nums">{chip.value}</span>{' '}
                {chip.label.toLowerCase()}
              </Link>
            ))}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="outline" size="sm">
          <Link to="/documents">
            <FileUp className="size-4" />
            Upload circular
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link to="/obligations/review">
            <ScanLine className="size-4" />
            Review extractions
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link to="/clients">
            <UserPlus className="size-4" />
            Add client
          </Link>
        </Button>
      </div>
    </Card>
  )
}
