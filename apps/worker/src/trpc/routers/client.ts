import { TRPCError } from "@trpc/server";
import { createClientSchema, updateClientSchema } from "@sebi/schemas";
import { router, orgProcedure } from "../trpc";
import { writeAuditLog } from "../../lib/audit";

export const clientRouter = router({
  listByIntermediary: orgProcedure.query(({ ctx }) =>
    ctx.prisma.client.findMany({
      where: { intermediaryId: ctx.intermediaryId },
      orderBy: { name: "asc" },
    }),
  ),

  create: orgProcedure.input(createClientSchema).mutation(async ({ ctx, input }) => {
    const client = await ctx.prisma.client.create({
      data: {
        name: input.name,
        onboardedAt: input.onboardedAt,
        intermediaryId: ctx.intermediaryId,
      },
    });
    await writeAuditLog({
      intermediaryId: ctx.intermediaryId,
      entityType: "Client",
      entityId: client.id,
      action: "CREATED",
      actorType: "USER",
      actorUserId: ctx.userId,
      afterState: { name: client.name, onboardedAt: client.onboardedAt?.toISOString() ?? null },
    });
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
