import { z } from "zod";
import { router, publicProcedure } from "../trpc";

export const dashboardRouter = router({
  summary: publicProcedure
    .input(z.object({ intermediaryId: z.string() }))
    .query(async ({ ctx, input }) => {
      const now = new Date();
      const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const [checklistByStatus, openGapsBySeverity, obligationsByStatus, upcoming] =
        await Promise.all([
          ctx.prisma.complianceChecklistItem.groupBy({
            by: ["status"],
            where: { intermediaryId: input.intermediaryId },
            _count: true,
          }),
          ctx.prisma.complianceGap.groupBy({
            by: ["severity"],
            where: { checklistItem: { intermediaryId: input.intermediaryId }, resolvedAt: null },
            _count: true,
          }),
          ctx.prisma.obligation.groupBy({
            by: ["status"],
            _count: true,
          }),
          ctx.prisma.complianceChecklistItem.findMany({
            where: {
              intermediaryId: input.intermediaryId,
              status: { not: "COMPLIANT" },
              dueDate: { gte: now, lte: in30Days },
            },
            include: { obligation: true, client: true },
            orderBy: { dueDate: "asc" },
            take: 10,
          }),
        ]);

      return {
        checklistByStatus: checklistByStatus.map((r) => ({ status: r.status, count: r._count })),
        openGapsBySeverity: openGapsBySeverity.map((r) => ({
          severity: r.severity,
          count: r._count,
        })),
        obligationsByStatus: obligationsByStatus.map((r) => ({
          status: r.status,
          count: r._count,
        })),
        upcomingDeadlines: upcoming.map((item) => ({
          id: item.id,
          dueDate: item.dueDate!,
          obligationTitle: item.obligation.title,
          clientName: item.client?.name ?? null,
        })),
      };
    }),
});
