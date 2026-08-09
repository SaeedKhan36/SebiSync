// TEMPORARY verification harness — delete before merging to main.
// Renders the REAL app shell and the REAL screen components outside the
// /_authenticated guard, with mock data, so the auth-gated UI can be
// inspected and iterated on without a Clerk session. Nothing here is
// imported by application code.
import { createFileRoute, Link } from '@tanstack/react-router'
import { z } from 'zod'
import { ShieldAlert } from 'lucide-react'
import { AppSidebar } from '#/components/layout/AppSidebar'
import { PageHeader } from '#/components/layout/PageHeader'
import { SettingsTabs } from '#/components/layout/SettingsTabs'
import { EmptyState } from '#/components/EmptyState'
import { Skeleton } from '#/components/ui/skeleton'
import { Button } from '#/components/ui/button'
import { IntermediaryProfile } from '#/features/settings/components/IntermediaryProfile'
import type { IntermediaryDetail } from '#/features/settings/hooks/useIntermediary'
import { GapTable } from '#/features/gaps/components/GapTable'
import type { GapListItem } from '#/features/gaps/hooks/useGapList'
import { SummaryCards } from '#/features/dashboard/components/SummaryCards'
import { ChecklistBreakdown } from '#/features/dashboard/components/ChecklistBreakdown'
import { GapSeverityBreakdown } from '#/features/dashboard/components/GapSeverityBreakdown'
import { UpcomingDeadlinesList } from '#/features/dashboard/components/UpcomingDeadlinesList'
import { RegisterStrip } from '#/features/dashboard/components/RegisterStrip'
import type { DashboardSummaryData } from '#/features/dashboard/hooks/useDashboardSummary'

const SCREENS = ['dashboard', 'gaps', 'settings', 'states'] as const

export const Route = createFileRoute('/preview-ui')({
  component: PreviewUi,
  validateSearch: z.object({
    screen: z.enum(SCREENS).optional(),
    empty: z.boolean().optional(),
  }),
})

const day = (n: number) => new Date(Date.now() + n * 86400000).toISOString()

const intermediary = {
  id: 'im_1',
  name: 'Alpha Wealth Advisors',
  sebiRegNo: 'INA00012345',
  createdAt: day(-33),
  category: { id: 'cat_1', name: 'Investment Adviser' },
  _count: { clients: 12, checklistItems: 78 },
} as unknown as IntermediaryDetail

const dashboard: DashboardSummaryData = {
  checklistByStatus: [
    { status: 'COMPLIANT', count: 42 },
    { status: 'IN_PROGRESS', count: 17 },
    { status: 'PENDING', count: 9 },
    { status: 'GAP', count: 6 },
    { status: 'NOT_APPLICABLE', count: 4 },
  ],
  openGapsBySeverity: [
    { severity: 'CRITICAL', count: 2 },
    { severity: 'HIGH', count: 7 },
    { severity: 'MEDIUM', count: 8 },
    { severity: 'LOW', count: 1 },
  ],
  obligationsByStatus: [{ status: 'PUBLISHED', count: 34 }],
  upcomingDeadlines: [
    { id: 'c1', dueDate: day(2), obligation: { title: 'Quarterly risk profiling review', code: 'IA/2024/07' }, client: { name: 'Meridian Capital' } },
    { id: 'c2', dueDate: day(6), obligation: { title: 'Annual compliance audit submission', code: 'IA/2023/12' }, client: { name: 'Northwind Family Office' } },
    { id: 'c3', dueDate: day(11), obligation: { title: 'Client agreement re-execution', code: 'IA/2025/02' }, client: { name: 'Vertex Partners' } },
  ],
} as unknown as DashboardSummaryData

const gap = (
  id: string,
  client: string,
  title: string,
  code: string,
  severity: string,
  gapType: string,
  days: number,
) =>
  ({
    id,
    severity,
    gapType,
    detectedAt: day(-days),
    resolvedAt: null,
    checklistItem: { id: `ci_${id}`, client: { id: 'cl', name: client }, obligation: { title, code } },
  }) as unknown as GapListItem

const gaps: GapListItem[] = [
  gap('g1', 'Meridian Capital', 'Risk profiling not refreshed for 14 clients', 'IA/2024/07', 'CRITICAL', 'MISSING_EVIDENCE', 3),
  gap('g2', 'Northwind Family Office', 'Annual compliance audit not filed', 'IA/2023/12', 'HIGH', 'OVERDUE', 9),
  gap('g3', 'Vertex Partners', 'Client agreement missing revised fee schedule', 'IA/2025/02', 'HIGH', 'MISSING_EVIDENCE', 12),
  gap('g4', 'Solstice Wealth', 'Complaint register not reconciled this quarter', 'IA/2024/03', 'MEDIUM', 'OVERDUE', 21),
  gap('g5', 'Harbourline Advisors', 'KYC re-verification pending', 'IA/2022/11', 'LOW', 'MISSING_EVIDENCE', 30),
]

function ScreenNav({ current }: { current: string }) {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 p-2">
      <span className="px-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        Harness
      </span>
      {SCREENS.map((screen) => (
        <Link
          key={screen}
          to="/preview-ui"
          search={{ screen }}
          className={`rounded-md px-2.5 py-1 text-sm capitalize ${
            current === screen ? 'bg-card text-foreground ring-1 ring-border' : 'text-muted-foreground'
          }`}
        >
          {screen}
        </Link>
      ))}
    </div>
  )
}

function PreviewUi() {
  const { screen = 'dashboard', empty = false } = Route.useSearch()

  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Real AppTopbar is skipped: its OrganizationSwitcher/UserButton
            require a Clerk session. Everything below it is the real thing. */}
        <header className="sticky top-0 z-30 flex h-14 items-center border-b border-border bg-background/85 px-4 backdrop-blur-sm md:px-8">
          <span className="text-sm text-muted-foreground">Preview harness (no Clerk session)</span>
        </header>
        <main className="flex-1 px-4 py-6 md:px-8">
          <div className="mx-auto w-full max-w-6xl">
            <ScreenNav current={screen} />

            {/* Composition mirrors routes/_authenticated/_org/dashboard/index.tsx
                exactly — if that page changes, change this too. */}
            {screen === 'dashboard' && (
              <div className="space-y-6">
                <PageHeader
                  title="Dashboard"
                  description="Your compliance posture across obligations, checklists and open gaps."
                />
                <SummaryCards summary={dashboard} />
                <div className="grid gap-4 md:grid-cols-2">
                  <ChecklistBreakdown data={dashboard.checklistByStatus} />
                  <GapSeverityBreakdown data={dashboard.openGapsBySeverity} />
                </div>
                <UpcomingDeadlinesList deadlines={dashboard.upcomingDeadlines} />
                <RegisterStrip data={dashboard.obligationsByStatus} />
              </div>
            )}

            {screen === 'gaps' && (
              <div className="space-y-6">
                <PageHeader
                  title="Gaps"
                  description="Detected compliance gaps ranked by severity — resolve them before they become findings."
                />
                <GapTable items={empty ? [] : gaps} onRowClick={() => {}} enableRowSelection />
              </div>
            )}

            {screen === 'settings' && (
              <div className="space-y-6">
                <PageHeader
                  title="Intermediary profile"
                  description="Your firm as provisioned with SEBI, and how much of the workspace it is using."
                />
                <SettingsTabs />
                <IntermediaryProfile intermediary={intermediary} />
              </div>
            )}

            {screen === 'states' && (
              <div className="space-y-6">
                <PageHeader title="States" description="Empty, loading, and action surfaces." />
                <EmptyState
                  icon={ShieldAlert}
                  title="No gaps"
                  description="Nothing matches the current filters."
                  action={<Button variant="outline">Clear filters</Button>}
                />
                <div className="space-y-3">
                  <Skeleton className="h-9 w-64" />
                  <Skeleton className="h-40" />
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button>Primary</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="destructive">Destructive</Button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
