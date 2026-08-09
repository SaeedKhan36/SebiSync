import { createFileRoute } from '@tanstack/react-router'
import { OrganizationProfile } from '@clerk/clerk-react'
import { PageHeader } from '#/components/layout/PageHeader'
import { SettingsTabs } from '#/components/layout/SettingsTabs'

export const Route = createFileRoute('/_authenticated/_org/settings/organization')({
  component: OrganizationSettingsPage,
})

function OrganizationSettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Organisation"
        description="Who can sign in to this workspace, and the organisation record itself."
      />
      <SettingsTabs />

      {/* Clerk ships this as a full-page surface: its own left nav plus a
          content panel, sized against the viewport. Give it the whole column
          and let it set its own width — boxing it into a narrow card is what
          squashed the nav and content into two cramped strips.

          The height overrides stay because rootBox/cardBox default to a tall
          min-height built for Clerk's longest tab, which leaves a large blank
          gap under a short one like "General". */}
      <div className="overflow-x-auto rounded-lg border border-border shadow-[0_1px_2px_rgba(28,25,23,0.04)] [&_.cl-card]:!h-auto [&_.cl-card]:!min-h-0 [&_.cl-card]:!w-full [&_.cl-card]:!max-w-none [&_.cl-card]:!shadow-none [&_.cl-cardBox]:!h-auto [&_.cl-cardBox]:!min-h-0 [&_.cl-cardBox]:!w-full [&_.cl-cardBox]:!max-w-none [&_.cl-pageScrollBox]:!h-auto [&_.cl-rootBox]:!h-auto [&_.cl-rootBox]:!min-h-0 [&_.cl-rootBox]:!w-full [&_.cl-rootBox]:!max-w-none">
        <OrganizationProfile routing="hash" />
      </div>
    </div>
  )
}
