import { createFileRoute } from '@tanstack/react-router'
import { Building2, ListChecks, Users } from 'lucide-react'
import { PageHeader } from '#/components/layout/PageHeader'
import { SettingsTabs } from '#/components/layout/SettingsTabs'
import { Skeleton } from '#/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { formatDate } from '#/lib/format'
import { useIntermediary } from '#/features/settings/hooks/useIntermediary'

export const Route = createFileRoute('/_authenticated/_org/settings/intermediary')({
  component: IntermediarySettingsPage,
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(context.trpc.intermediary.getCurrent.queryOptions()),
  pendingComponent: IntermediarySettingsSkeleton,
})

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium text-foreground">{value}</dd>
    </div>
  )
}

function IntermediarySettingsPage() {
  const { data: intermediary } = useIntermediary()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Intermediary profile"
        description="Your firm as provisioned with SEBI, and how much of the workspace it is using."
      />
      <SettingsTabs />

      <Card className="gap-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[15px] font-semibold">
            <Building2 className="size-4 text-[#3730a3]" />
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
        <div className="rounded-lg border border-border bg-card p-4 shadow-[0_1px_2px_rgba(28,25,23,0.04)]">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Users className="size-3.5" />
            Clients tracked
          </div>
          <p className="mt-1.5 text-2xl font-semibold tracking-tight">
            {intermediary._count.clients}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 shadow-[0_1px_2px_rgba(28,25,23,0.04)]">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ListChecks className="size-3.5" />
            Checklist items
          </div>
          <p className="mt-1.5 text-2xl font-semibold tracking-tight">
            {intermediary._count.checklistItems}
          </p>
        </div>
      </div>
    </div>
  )
}

function IntermediarySettingsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-10 w-56" />
      <Skeleton className="h-40" />
      <div className="grid grid-cols-2 gap-4 lg:max-w-md">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    </div>
  )
}
