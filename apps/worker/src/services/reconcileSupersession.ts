import { prisma } from "@sebi/db";
import { writeAuditLog } from "../lib/audit";
import { proposeSupersessions, type MatchableObligation } from "./supersessionRules";

// Reconciliation half of the amendment flow: after an amending circular has
// been ingested, work out which of its DRAFT obligations replace which
// PUBLISHED obligations of the circular it supersedes, and record those as
// SupersessionProposal rows.
//
// This function proposes. It does not supersede anything — no Obligation
// status changes here, no checklist item is touched. Confirmation happens in
// obligation.confirmSupersession, behind the same admin review gate that
// already governs DRAFT → PUBLISHED. See supersessionRules.ts for why that
// asymmetry is deliberate.

export interface ReconcileResult {
  documentId: string;
  supersedesDocumentId: string;
  proposed: number;
  amends: number;
  unchanged: number;
  new: number;
}

const MATCHABLE_SELECT = {
  id: true,
  code: true,
  title: true,
  citationText: true,
  obligatedAction: true,
} as const;

export async function reconcileSupersession(documentId: string): Promise<ReconcileResult | null> {
  const document = await prisma.regulatoryDocument.findUniqueOrThrow({
    where: { id: documentId },
    select: { id: true, supersedesId: true },
  });

  // Not an amending circular — nothing to reconcile against, and every draft
  // is new by definition. Returning null rather than an empty result lets the
  // caller stay quiet instead of reporting a vacuous "0 proposals".
  if (!document.supersedesId) return null;

  const [drafts, priors] = await Promise.all([
    prisma.obligation.findMany({
      where: { documentId, status: "DRAFT" },
      select: MATCHABLE_SELECT,
      orderBy: { createdAt: "asc" },
    }),
    // Only what is actually in force in the prior circular. DRAFT obligations
    // there were never adopted, and an already-SUPERSEDED one has been
    // replaced once already — proposing to retire either would be meaningless.
    prisma.obligation.findMany({
      where: { documentId: document.supersedesId, status: "PUBLISHED" },
      select: MATCHABLE_SELECT,
    }),
  ]);

  const proposals = proposeSupersessions(
    drafts as MatchableObligation[],
    priors as MatchableObligation[],
  );

  // Re-running ingestion for the same document should replace its previous
  // suggestions, not stack a second set beside them. Only PROPOSED rows are
  // cleared: a decision a human already made is not the machine's to discard.
  await prisma.supersessionProposal.deleteMany({
    where: { status: "PROPOSED", newObligation: { documentId } },
  });

  for (const proposal of proposals) {
    await prisma.supersessionProposal.create({
      data: {
        newObligationId: proposal.newObligationId,
        priorObligationId: proposal.priorObligationId,
        kind: proposal.kind,
        matchScore: proposal.matchScore,
        rationale: proposal.rationale,
      },
    });
  }

  const result: ReconcileResult = {
    documentId,
    supersedesDocumentId: document.supersedesId,
    proposed: proposals.length,
    amends: proposals.filter((p) => p.kind === "AMENDS").length,
    unchanged: proposals.filter((p) => p.kind === "UNCHANGED").length,
    new: proposals.filter((p) => p.kind === "NEW").length,
  };

  await writeAuditLog({
    entityType: "RegulatoryDocument",
    entityId: documentId,
    action: "SUPERSESSION_PROPOSED",
    actorType: "SYSTEM_AGENT",
    metadata: { ...result },
  });

  return result;
}
