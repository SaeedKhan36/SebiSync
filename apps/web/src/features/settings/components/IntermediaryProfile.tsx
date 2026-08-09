import { Building2, ListChecks, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { formatDate } from '#/lib/format'
import type { IntermediaryDetail } from '#/features/settings/hooks/useIntermediary'

// Presentational: takes the intermediary as a prop rather than calling
// useIntermediary() itself, so it can be rendered outside an authenticated
// tRPC context (see routes/preview-ui.tsx) — same split the dashboard
// components already use.

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium text-foreground">{value}</dd>
    </div>
  )
}

function StatTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users
  label: string
  value: number
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-[0_1px_2px_rgba(28,25,23,0.04)]">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </div>
      <p className="mt-1.5 text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  )
}

export function IntermediaryProfile({ intermediary }: { intermediary: IntermediaryDetail }) {
  return (
    <div className="space-y-6">
      <Card className="gap-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[15px] font-semibold">
            <Building2 className="size-4 text-primary" />
            Intermediary details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
            <Detail label="Name" value={intermediary.name} />
            <Detail label="Category" value={intermediary.category.name} />
            <Detail
              label="SEBI registration no."
              value={
                intermediary.sebiRegNo ? (
                  <span className="font-mono text-[13px]">{intermediary.sebiRegNo}</span>
                ) : (
                  '—'
                )
              }
            />
            <Detail label="Member since" value={formatDate(intermediary.createdAt)} />
          </dl>
        </CardContent>
      </Card>

      {/* Compact usage stats — same tile language as the dashboard. */}
      <div className="grid grid-cols-2 gap-4 lg:max-w-md">
        <StatTile icon={Users} label="Clients tracked" value={intermediary._count.clients} />
        <StatTile
          icon={ListChecks}
          label="Checklist items"
          value={intermediary._count.checklistItems}
        />
      </div>
    </div>
  )
}
