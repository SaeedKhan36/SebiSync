import { ArrowRight, GitBranch } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { StatusBadge } from '#/components/status/StatusBadge'
import { supersessionKindColorMap } from '#/components/status/supersessionMaps'
import { useDecideSupersession } from '#/features/obligations/hooks/useDecideSupersession'
import type { SupersessionProposal } from '#/features/obligations/hooks/useSupersessionProposals'

// The amendment review gate. Shown above the DRAFT queue when a circular was
// ingested with --supersedes, because these decisions are upstream of
// publishing: confirming a mapping is what makes publishing the draft also
// retire the obligation it replaces.
//
// Nothing here is auto-applied, and the panel is written to make that legible
// — the machine's suggestion and its reasoning are shown side by side with the
// clause it would retire, so the reviewer is agreeing to a specific,
// inspectable claim rather than accepting a score.
export function SupersessionReviewPanel({ proposals }: { proposals: SupersessionProposal[] }) {
  if (proposals.length === 0) return null

  const amending = proposals.filter((p) => p.kind !== 'NEW').length

  return (
    <Card className="gap-4 border-orange-500/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[15px] font-semibold">
          <GitBranch className="size-4 shrink-0 text-orange-600 dark:text-orange-400" />
          Amendment review
        </CardTitle>
        <p className="text-muted-foreground text-sm">
          {proposals.length} proposed mapping{proposals.length === 1 ? '' : 's'} from the amending
          circular
          {amending > 0 && (
            <>
              {' '}
              — {amending} would retire an obligation that is currently in force. Nothing is
              superseded until you confirm the mapping <em>and</em> publish the replacement.
            </>
          )}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {proposals.map((proposal) => (
          <ProposalRow key={proposal.id} proposal={proposal} />
        ))}
      </CardContent>
    </Card>
  )
}

function ProposalRow({ proposal }: { proposal: SupersessionProposal }) {
  const decide = useDecideSupersession()

  function handleDecision(decision: 'CONFIRM' | 'REJECT') {
    decide.mutate(
      { proposalId: proposal.id, decision },
      {
        onSuccess: () => {
          toast.success(
            decision === 'CONFIRM'
              ? `Mapping confirmed for ${proposal.newObligation.code}`
              : `Mapping rejected for ${proposal.newObligation.code}`,
          )
        },
        onError: (error) => toast.error(error.message),
      },
    )
  }

  return (
    <div className="space-y-3 rounded-md border border-border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge value={proposal.kind} map={supersessionKindColorMap} />
        {proposal.matchScore != null && (
          <span className="text-muted-foreground font-mono text-xs">
            {Math.round(proposal.matchScore * 100)}% match
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-[1fr_auto_1fr]">
        <div className="space-y-1">
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
            {proposal.priorObligation ? 'Currently in force' : 'No prior obligation'}
          </p>
          {proposal.priorObligation ? (
            <>
              <p className="font-mono text-xs">{proposal.priorObligation.code}</p>
              <p className="text-sm">{proposal.priorObligation.title}</p>
              <p className="text-muted-foreground text-xs">
                {proposal.priorObligation.obligatedAction}
              </p>
            </>
          ) : (
            <p className="text-muted-foreground text-sm">
              Nothing in the superseded circular corresponds to this clause.
            </p>
          )}
        </div>

        <ArrowRight className="text-muted-foreground mt-6 hidden size-4 shrink-0 sm:block" />

        <div className="space-y-1">
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
            Proposed replacement
          </p>
          <p className="font-mono text-xs">{proposal.newObligation.code}</p>
          <p className="text-sm">{proposal.newObligation.title}</p>
          <p className="text-muted-foreground text-xs">{proposal.newObligation.obligatedAction}</p>
        </div>
      </div>

      <p className="text-muted-foreground border-t border-dashed border-border pt-2 text-xs">
        {proposal.rationale}
      </p>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={decide.isPending} onClick={() => handleDecision('CONFIRM')}>
          {decide.isPending ? 'Saving…' : 'Confirm mapping'}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={decide.isPending}
          onClick={() => handleDecision('REJECT')}
        >
          Reject
        </Button>
      </div>
    </div>
  )
}
