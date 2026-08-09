import { prisma } from "@sebi/db";
import { writeAuditLog } from "../lib/audit";

// Retires the obligation that an amendment replaces.
//
// Called from obligation.publish, not from the confirm-the-mapping mutation,
// and that placement is the whole point: confirming a proposed mapping only
// records a decision, while publishing is the moment the replacement actually
// takes effect. Doing both in one step means there is never a window where the
// old requirement has been switched off and the new one is not yet in force.
//
// What follows from retiring an obligation:
//   - its outstanding checklist items become NOT_APPLICABLE — staff should not
//     be chasing evidence for a requirement SEBI has replaced;
//   - their open gaps are resolved with a reason, rather than deleted, so the
//     dashboard stops alarming without the history being rewritten;
//   - everything is audit-logged against both obligations.
//
// COMPLIANT items are left alone. Work that was genuinely completed under the
// old rule stays completed — that record is the evidence of past compliance.

export interface SupersedeResult {
  checklistItemsClosed: number;
  gapsResolved: number;
}

export async function supersedeObligation(
  priorObligationId: string,
  replacementObligationId: string,
  actorUserId?: string,
): Promise<SupersedeResult> {
  const [prior, replacement] = await Promise.all([
    prisma.obligation.findUniqueOrThrow({ where: { id: priorObligationId } }),
    prisma.obligation.findUniqueOrThrow({ where: { id: replacementObligationId } }),
  ]);

  const note = `Obligation superseded by ${replacement.code} (${replacement.title})`;

  const openItems = await prisma.complianceChecklistItem.findMany({
    where: {
      obligationId: priorObligationId,
      status: { in: ["PENDING", "IN_PROGRESS", "GAP"] },
    },
    select: { id: true, intermediaryId: true },
  });
  const openItemIds = openItems.map((i) => i.id);

  const [{ count: gapsResolved }, { count: checklistItemsClosed }] = await prisma.$transaction([
    prisma.complianceGap.updateMany({
      where: { checklistItemId: { in: openItemIds }, resolvedAt: null },
      data: { resolvedAt: new Date(), resolutionNote: note },
    }),
    prisma.complianceChecklistItem.updateMany({
      where: { id: { in: openItemIds } },
      data: { status: "NOT_APPLICABLE" },
    }),
    prisma.obligation.update({
      where: { id: priorObligationId },
      data: { status: "SUPERSEDED" },
    }),
  ]);

  await writeAuditLog({
    entityType: "Obligation",
    entityId: prior.id,
    action: "STATUS_CHANGED",
    actorType: actorUserId ? "USER" : "SYSTEM_AGENT",
    actorUserId,
    beforeState: { status: prior.status },
    afterState: { status: "SUPERSEDED" },
    metadata: {
      supersededBy: replacement.id,
      supersededByCode: replacement.code,
      checklistItemsClosed,
      gapsResolved,
    },
    obligationId: prior.id,
  });

  // One entry per affected tenant, so a firm's own audit trail explains why
  // its checklist items went NOT_APPLICABLE without them having to read a
  // global regulatory event.
  for (const intermediaryId of new Set(openItems.map((i) => i.intermediaryId))) {
    await writeAuditLog({
      intermediaryId,
      entityType: "ChecklistItem",
      entityId: prior.id,
      action: "CHECKLIST_ITEMS_CLOSED_ON_SUPERSESSION",
      actorType: actorUserId ? "USER" : "SYSTEM_AGENT",
      actorUserId,
      metadata: { obligationId: prior.id, replacementObligationId: replacement.id, note },
      obligationId: prior.id,
    });
  }

  return { checklistItemsClosed, gapsResolved };
}
