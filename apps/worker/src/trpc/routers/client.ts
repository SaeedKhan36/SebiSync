import { router, orgProcedure } from "../trpc";

export const clientRouter = router({
  listByIntermediary: orgProcedure.query(({ ctx }) =>
    ctx.prisma.client.findMany({
      where: { intermediaryId: ctx.intermediaryId },
      orderBy: { name: "asc" },
    }),
  ),
});
