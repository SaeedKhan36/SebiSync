import { router, orgProcedure } from "../trpc";

export const dashboardRouter = router({
  summary: orgProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [checklistByStatus, openGapsBySeverity, obligationsByStatus, upcoming] =
      await Promise.all([
        ctx.prisma.complianceChecklistItem.groupBy({
          by: ["status"],
          where: { intermediaryId: ctx.intermediaryId },
          _count: true,
        }),
        ctx.prisma.complianceGap.groupBy({
          by: ["severity"],
          where: { checklistItem: { intermediaryId: ctx.intermediaryId }, resolvedAt: null },
          _count: true,
        }),
        ctx.prisma.obligation.groupBy({
          by: ["status"],
          _count: true,
        }),
        ctx.prisma.complianceChecklistItem.findMany({
          where: {
            intermediaryId: ctx.intermediaryId,
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
