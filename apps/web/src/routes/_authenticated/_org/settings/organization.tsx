import { createFileRoute } from '@tanstack/react-router'
import { OrganizationProfile } from '@clerk/clerk-react'
import { Building2, ListChecks, Users } from 'lucide-react'
import { PageHeader } from '#/components/layout/PageHeader'
import { Skeleton } from '#/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { formatDate } from '#/lib/format'
import { useIntermediary } from '#/features/settings/hooks/useIntermediary'

export const Route = createFileRoute('/_authenticated/_org/settings/organization')({
  component: OrganizationSettingsPage,
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(context.trpc.intermediary.getCurrent.queryOptions()),
  pendingComponent: OrganizationSettingsSkeleton,
})

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium text-foreground">{value}</dd>
    </div>
  )
}

function OrganizationSettingsPage() {
  const { data: intermediary } = useIntermediary()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organization settings"
        description="Your intermediary profile as provisioned with SEBI, and organisation membership."
      />
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div className="space-y-6">
          <Card className="gap-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[15px] font-semibold">
                <Building2 className="size-4 text-[#3730a3]" />
                Intermediary details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Detail label="Name" value={intermediary.name} />
                </div>
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
          <div className="grid grid-cols-2 gap-4">
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

        {/* Clerk's rootBox/cardBox default to a fixed tall min-height built
            for its full multi-page nav — override to the content's actual
            height so this card doesn't leave a huge blank gap under a
            single short tab like "General". */}
        <div className="overflow-x-auto rounded-lg border border-border shadow-[0_1px_2px_rgba(28,25,23,0.04)] [&_.cl-card]:!h-auto [&_.cl-card]:!min-h-0 [&_.cl-card]:!shadow-none [&_.cl-cardBox]:!h-auto [&_.cl-cardBox]:!min-h-0 [&_.cl-pageScrollBox]:!h-auto [&_.cl-rootBox]:!h-auto [&_.cl-rootBox]:!min-h-0">
          <OrganizationProfile routing="hash" />
        </div>
      </div>
    </div>
  )
}

function OrganizationSettingsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-9 w-64" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-64" />
        <Skeleton className="h-96" />
      </div>
    </div>
  )
}
