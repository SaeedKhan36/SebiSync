import { createFileRoute } from '@tanstack/react-router'
import { PageHeader } from '#/components/layout/PageHeader'
import { SettingsTabs } from '#/components/layout/SettingsTabs'
import { Skeleton } from '#/components/ui/skeleton'
import { IntermediaryProfile } from '#/features/settings/components/IntermediaryProfile'
import { useIntermediary } from '#/features/settings/hooks/useIntermediary'

export const Route = createFileRoute('/_authenticated/_org/settings/intermediary')({
  component: IntermediarySettingsPage,
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(context.trpc.intermediary.getCurrent.queryOptions()),
  pendingComponent: IntermediarySettingsSkeleton,
})

function IntermediarySettingsPage() {
  const { data: intermediary } = useIntermediary()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Intermediary profile"
        description="Your firm as provisioned with SEBI, and how much of the workspace it is using."
      />
      <SettingsTabs />
      <IntermediaryProfile intermediary={intermediary} />
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
