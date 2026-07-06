import { TRPCError } from "@trpc/server";
import { provisionIntermediarySchema } from "@sebi/schemas";
import { router, protectedProcedure, clerkOrgProcedure } from "../trpc";
import { writeAuditLog } from "../../lib/audit";

export const intermediaryRouter = router({
  // Needed to populate the category selector on the provisioning form.
  listCategories: protectedProcedure.query(({ ctx }) =>
    ctx.prisma.intermediaryCategory.findMany({ orderBy: { name: "asc" } }),
  ),

  provision: clerkOrgProcedure
    .input(provisionIntermediarySchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.intermediary.findUnique({
        where: { clerkOrgId: ctx.orgId },
      });
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "This organization is already provisioned" });
      }
      const category = await ctx.prisma.intermediaryCategory.findUniqueOrThrow({
        where: { code: input.categoryCode },
      });
      const intermediary = await ctx.prisma.intermediary.create({
        data: {
          name: input.name,
          sebiRegNo: input.sebiRegNo,
          categoryId: category.id,
          clerkOrgId: ctx.orgId,
        },
      });
      await writeAuditLog({
        intermediaryId: intermediary.id,
        entityType: "Intermediary",
        entityId: intermediary.id,
        action: "CREATED",
        actorType: "USER",
        actorUserId: ctx.userId,
        afterState: intermediary,
      });
      return intermediary;
    }),
});
