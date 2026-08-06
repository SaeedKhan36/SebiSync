// TEMPORARY verification harness — delete after screenshotting.
// Renders the real dashboard components outside the /_authenticated guard so
// they can be inspected without a Clerk session.
import { createFileRoute } from '@tanstack/react-router'
import type { DashboardSummaryData } from '#/features/dashboard/hooks/useDashboardSummary'
import { SummaryCards } from '#/features/dashboard/components/SummaryCards'
import { ChecklistBreakdown } from '#/features/dashboard/components/ChecklistBreakdown'
import { GapSeverityBreakdown } from '#/features/dashboard/components/GapSeverityBreakdown'
import { UpcomingDeadlinesList } from '#/features/dashboard/components/UpcomingDeadlinesList'
import { RegisterStrip } from '#/features/dashboard/components/RegisterStrip'
import { PageHeader } from '#/components/layout/PageHeader'

export const Route = createFileRoute('/preview-dashboard')({ component: PreviewDashboard })

const day = (n: number) => new Date(Date.now() + n * 86400000).toISOString()

// Matches today's seed data exactly — the small-N case that motivated the rework.
const sparse: DashboardSummaryData = {
  checklistByStatus: [{ status: 'IN_PROGRESS', count: 1 }],
  openGapsBySeverity: [],
  obligationsByStatus: [{ status: 'PUBLISHED', count: 6 }],
  upcomingDeadlines: [],
}

const populated: DashboardSummaryData = {
  checklistByStatus: [
    { status: 'COMPLIANT', count: 42 },
    { status: 'IN_PROGRESS', count: 17 },
    { status: 'PENDING', count: 9 },
    { status: 'GAP', count: 6 },
    { status: 'NOT_APPLICABLE', count: 4 },
  ],
  openGapsBySeverity: [
    { severity: 'CRITICAL', count: 2 },
    { severity: 'HIGH', count: 5 },
    { severity: 'MEDIUM', count: 8 },
    { severity: 'LOW', count: 3 },
  ],
  obligationsByStatus: [
    { status: 'PUBLISHED', count: 34 },
    { status: 'REVIEWED', count: 7 },
    { status: 'DRAFT', count: 12 },
    { status: 'SUPERSEDED', count: 3 },
  ],
  upcomingDeadlines: [
    { id: 'a', dueDate: day(0), obligationTitle: 'Quarterly SCORES complaint status report', clientName: 'Meridian Capital' },
    { id: 'b', dueDate: day(3), obligationTitle: 'Half-yearly internal audit submission', clientName: null },
    { id: 'c', dueDate: day(6), obligationTitle: 'Client risk-profiling review — annual refresh', clientName: 'Ashwin Family Office' },
    { id: 'd', dueDate: day(14), obligationTitle: 'Net-worth certificate filing with SEBI', clientName: null },
    { id: 'e', dueDate: day(23), obligationTitle: 'Investor grievance redressal mechanism attestation', clientName: 'Peak Advisory LLP' },
  ],
}

function Board({ summary }: { summary: DashboardSummaryData }) {
  return (
    <div className="space-y-6">
      <SummaryCards summary={summary} />
      <div className="grid gap-4 md:grid-cols-2">
        <ChecklistBreakdown data={summary.checklistByStatus} />
        <GapSeverityBreakdown data={summary.openGapsBySeverity} />
      </div>
      <UpcomingDeadlinesList deadlines={summary.upcomingDeadlines} />
      <RegisterStrip data={summary.obligationsByStatus} />
    </div>
  )
}

function PreviewDashboard() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-10 px-8 py-6">
      <PageHeader title="Dashboard" description="Populated case" />
      <Board summary={populated} />
      <PageHeader title="Dashboard" description="Sparse case — today's seed data" />
      <Board summary={sparse} />
    </div>
  )
}
