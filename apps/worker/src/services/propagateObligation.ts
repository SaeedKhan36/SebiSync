import { prisma } from "@sebi/db";
import { writeAuditLog } from "../lib/audit";

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
      const result = await prisma.complianceChecklistItem.createMany({
        data: intermediary.clients.map((client) => ({
          intermediaryId: intermediary.id,
          obligationId: obligation.id,
          clientId: client.id,
          status: "PENDING" as const,
        })),
        skipDuplicates: true,
      });
      count = result.count;
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
