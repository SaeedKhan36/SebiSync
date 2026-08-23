import { TRPCError } from "@trpc/server";
import { createClientSchema, updateClientSchema } from "@sebi/schemas";
import { router, orgProcedure } from "../trpc";
import { writeAuditLog } from "../../lib/audit";
import { backfillClientChecklists } from "../../services/backfillClientChecklists";

export const clientRouter = router({
  listByIntermediary: orgProcedure.query(({ ctx }) =>
    ctx.prisma.client.findMany({
      where: { intermediaryId: ctx.intermediaryId },
      orderBy: { name: "asc" },
    }),
  ),

  create: orgProcedure.input(createClientSchema).mutation(async ({ ctx, input }) => {
    // Client row + published-obligation backfill commit together so a
    // mid-flight DB failure cannot leave an onboarded client with no
    // checklist items (and no way to retry without creating a duplicate client).
    const { client, checklistItemsCreated } = await ctx.prisma.$transaction(
      async (tx) => {
        const created = await tx.client.create({
          data: {
            name: input.name,
            onboardedAt: input.onboardedAt,
            intermediaryId: ctx.intermediaryId,
          },
        });
        const count = await backfillClientChecklists(tx, created.id);
        return { client: created, checklistItemsCreated: count };
      },
      // Neon round-trips can blow the 5s default when several published
      // obligations are assigned in the same transaction as the insert.
      { timeout: 15_000 },
    );
    await writeAuditLog({
      intermediaryId: ctx.intermediaryId,
      entityType: "Client",
      entityId: client.id,
      action: "CREATED",
      actorType: "USER",
      actorUserId: ctx.userId,
      afterState: { name: client.name, onboardedAt: client.onboardedAt?.toISOString() ?? null },
    });
    if (checklistItemsCreated > 0) {
      await writeAuditLog({
        intermediaryId: ctx.intermediaryId,
        entityType: "ChecklistItem",
        entityId: client.id,
        action: "CHECKLIST_ITEMS_CREATED",
        actorType: "SYSTEM_AGENT",
        metadata: { clientId: client.id, count: checklistItemsCreated },
      });
    }
    return client;
  }),

  update: orgProcedure.input(updateClientSchema).mutation(async ({ ctx, input }) => {
    const existing = await ctx.prisma.client.findUniqueOrThrow({ where: { id: input.id } });
    if (existing.intermediaryId !== ctx.intermediaryId) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Client belongs to another organization" });
    }
    const client = await ctx.prisma.client.update({
      where: { id: input.id },
      data: { name: input.name, onboardedAt: input.onboardedAt },
    });
    await writeAuditLog({
      intermediaryId: ctx.intermediaryId,
      entityType: "Client",
      entityId: client.id,
      action: "UPDATED",
      actorType: "USER",
      actorUserId: ctx.userId,
      beforeState: { name: existing.name, onboardedAt: existing.onboardedAt?.toISOString() ?? null },
      afterState: { name: client.name, onboardedAt: client.onboardedAt?.toISOString() ?? null },
    });
    return client;
  }),
});
