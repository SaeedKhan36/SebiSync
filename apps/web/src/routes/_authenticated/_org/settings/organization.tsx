import { createFileRoute } from '@tanstack/react-router'
import { OrganizationProfile } from '@clerk/clerk-react'
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

function OrganizationSettingsPage() {
  const { data: intermediary } = useIntermediary()

  return (
    <div className="space-y-6">
      <PageHeader title="Organization settings" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Intermediary details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm">
            <div className="col-span-2">
              <p className="text-muted-foreground text-xs">Name</p>
              <p className="font-medium">{intermediary.name}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Category</p>
              <p>{intermediary.category.name}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">SEBI registration no.</p>
              <p>{intermediary.sebiRegNo ?? '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Member since</p>
              <p>{formatDate(intermediary.createdAt)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Clients tracked</p>
              <p>{intermediary._count.clients}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Checklist items</p>
              <p>{intermediary._count.checklistItems}</p>
            </div>
          </CardContent>
        </Card>

        <div className="[&_.cl-rootBox]:w-full">
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
