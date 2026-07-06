import { createFileRoute } from '@tanstack/react-router'
import { PageHeader } from '#/components/layout/PageHeader'
import { ProvisionOrgForm } from '#/features/onboarding/components/ProvisionOrgForm'

export const Route = createFileRoute('/_authenticated/_org/onboarding/')({
  component: OnboardingPage,
})

function OnboardingPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Set up your organization" />
      <p className="text-muted-foreground max-w-md">
        This Clerk organization hasn't been provisioned as an Intermediary yet. Fill in the
        details below to get started.
      </p>
      <ProvisionOrgForm />
    </div>
  )
}
