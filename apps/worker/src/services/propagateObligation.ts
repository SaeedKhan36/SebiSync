import { prisma } from "@sebi/db";
import type { Prisma } from "@sebi/db";
import { writeAuditLog } from "../lib/audit";

export type ChecklistWriteClient = Prisma.TransactionClient | typeof prisma;

// Shared write path for PER_CLIENT checklist items. Used both by publish
// fan-out (one obligation → every matching client) and by new-client backfill
// (one client → every matching published obligation). skipDuplicates relies
// on the partial unique index on (obligationId, clientId) WHERE clientId IS
// NOT NULL AND triggerEventId IS NULL.
export async function createPerClientChecklistItems(
  db: ChecklistWriteClient,
  args: {
    intermediaryId: string;
    items: Array<{ obligationId: string; clientId: string }>;
  },
): Promise<number> {
  if (args.items.length === 0) return 0;
  const result = await db.complianceChecklistItem.createMany({
    data: args.items.map((item) => ({
      intermediaryId: args.intermediaryId,
      obligationId: item.obligationId,
      clientId: item.clientId,
      status: "PENDING" as const,
    })),
    skipDuplicates: true,
  });
  return result.count;
}

// On publish: PER_CLIENT obligations fan out one ComplianceChecklistItem per
// Client under every matching-category Intermediary. ANNUAL/ONE_TIME fan out
// per-intermediary with a computed dueDate where applicable. PER_EVENT
// obligations (e.g. SCORES) do NOT auto fan-out here — those checklist items
// are created on-demand via checklist.createTriggerEvent when a real event
// occurs, backed by the TriggerEvent model.
export async function propagateObligation(obligationId: string): Promise<void> {
  const obligation = await prisma.obligation.findUniqueOrThrow({
    where: { id: obligationId },
    include: { applicableCategories: true },
  });

  if (obligation.frequency === "PER_EVENT") {
    return;
  }

  const categoryIds = obligation.applicableCategories.map((c) => c.id);
  const intermediaries = await prisma.intermediary.findMany({
    where: { categoryId: { in: categoryIds } },
    include: { clients: true },
  });

  const dueDate =
    obligation.deadlineDays != null
      ? new Date(Date.now() + obligation.deadlineDays * 24 * 60 * 60 * 1000)
      : null;

  for (const intermediary of intermediaries) {
    let count = 0;

    if (obligation.frequency === "PER_CLIENT") {
      count = await createPerClientChecklistItems(prisma, {
        intermediaryId: intermediary.id,
        items: intermediary.clients.map((client) => ({
          obligationId: obligation.id,
          clientId: client.id,
        })),
      });
    } else {
      // ANNUAL / ONE_TIME: intermediary-level, not per-client.
      const result = await prisma.complianceChecklistItem.createMany({
        data: [
          {
            intermediaryId: intermediary.id,
            obligationId: obligation.id,
            clientId: null,
            dueDate,
            status: "PENDING" as const,
          },
        ],
        skipDuplicates: true,
      });
      count = result.count;
    }

    await writeAuditLog({
      intermediaryId: intermediary.id,
      entityType: "ChecklistItem",
      entityId: obligation.id,
      action: "CHECKLIST_ITEMS_CREATED",
      actorType: "SYSTEM_AGENT",
      metadata: { obligationId: obligation.id, count },
    });
  }
}
