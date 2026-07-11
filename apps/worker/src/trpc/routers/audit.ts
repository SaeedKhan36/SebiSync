import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, orgProcedure } from "../trpc";

export const auditRouter = router({

  listByEntity: orgProcedure
    .input(z.object({ checklistItemId: z.string() }))
    .query(async ({ ctx, input }) => {
      const item = await ctx.prisma.complianceChecklistItem.findUniqueOrThrow({
        where: { id: input.checklistItemId },
      });
      if (item.intermediaryId !== ctx.intermediaryId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Checklist item belongs to another organization" });
      }
      return ctx.prisma.auditLogEntry.findMany({
        where: { checklistItemId: input.checklistItemId },
        orderBy: { createdAt: "desc" },
      });
    }),
});
