import { createPerClientChecklistItems, type ChecklistWriteClient } from "./propagateObligation";

// Inverse of propagateObligation's PER_CLIENT fan-out: when a client is
// onboarded after obligations have already been published, assign them a
// checklist item for every in-force PER_CLIENT obligation that applies to
// their intermediary's category.
//
// ANNUAL / ONE_TIME items are intermediary-level and already created at
// publish time, so they are not touched here. PER_EVENT items are created
// on-demand via checklist.createTriggerEvent, same as publish fan-out.
export async function backfillClientChecklists(
  db: ChecklistWriteClient,
  clientId: string,
): Promise<number> {
  const client = await db.client.findUniqueOrThrow({
    where: { id: clientId },
    select: {
      id: true,
      intermediaryId: true,
      intermediary: { select: { categoryId: true } },
    },
  });

  const obligations = await db.obligation.findMany({
    where: {
      status: "PUBLISHED",
      frequency: "PER_CLIENT",
      applicableCategories: { some: { id: client.intermediary.categoryId } },
    },
    select: { id: true },
  });

  return createPerClientChecklistItems(db, {
    intermediaryId: client.intermediaryId,
    items: obligations.map((obligation) => ({
      obligationId: obligation.id,
      clientId: client.id,
    })),
  });
}
