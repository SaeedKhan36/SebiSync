import { initTRPC, TRPCError } from "@trpc/server";
import type { Context } from "./context";

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

// Requires a signed-in Clerk user. Does not require an active organization.
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Sign-in required" });
  }
  return next({ ctx: { ...ctx, userId: ctx.userId } });
});

// Requires a signed-in user AND an active Clerk organization that maps to a
// provisioned Intermediary. All org-scoped queries should use this so every
// procedure sees exactly one org's data, resolved server-side (never taken
// as client input).
export const orgProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!ctx.orgId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "No active organization selected" });
  }
  if (!ctx.intermediaryId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "This organization has not been provisioned as an Intermediary",
    });
  }
  return next({ ctx: { ...ctx, intermediaryId: ctx.intermediaryId } });
});
