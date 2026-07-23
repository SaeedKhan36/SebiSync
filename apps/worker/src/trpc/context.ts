import type { Context as HonoContext } from "hono";
import { prisma } from "@sebi/db";
import { authenticateRequest } from "../lib/auth";

export async function createContext(_opts: unknown, c: HonoContext) {
  const auth = await authenticateRequest(c.req.raw);

  let intermediaryId: string | null = null;
  if (auth?.orgId) {
    const intermediary = await prisma.intermediary.findUnique({
      where: { clerkOrgId: auth.orgId },
    });
    intermediaryId = intermediary?.id ?? null;
  }

  return {
    prisma,
    userId: auth?.userId ?? null,
    orgId: auth?.orgId ?? null,
    orgRole: auth?.orgRole ?? null,
    intermediaryId,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
