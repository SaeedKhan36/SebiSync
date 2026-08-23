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

// Requires a signed-in user AND an active Clerk organization, but NOT that it
// already be provisioned as an Intermediary — this is the one tier below
// orgProcedure, used only by intermediary.provision (the procedure that
// creates that very link, so it can't require it to already exist).
export const clerkOrgProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!ctx.orgId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "No active organization selected" });
  }
  return next({ ctx: { ...ctx, orgId: ctx.orgId } });
});

// Requires a signed-in user whose active Clerk org role is "org:admin".
// Deliberately built on protectedProcedure, not orgProcedure — regulatory
// documents/obligations are global data, not scoped to one Intermediary, so
// this only cares about the caller's role, not which org is provisioned.
export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.orgRole !== "org:admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin role required" });
  }
  return next({ ctx });
});

// Requires a signed-in user AND an active Clerk organization that maps to a
// provisioned Intermediary. All org-scoped queries should use this so every
// procedure sees exactly one org's data, resolved server-side (never taken
// as client input).
export const orgProcedure = clerkOrgProcedure.use(({ ctx, next }) => {
  if (!ctx.intermediaryId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "This organization has not been provisioned as an Intermediary",
    });
  }
  return next({ ctx: { ...ctx, intermediaryId: ctx.intermediaryId } });
});

// orgProcedure + the org:admin role check. adminProcedure can't be reused —
// it's protectedProcedure-based and has no intermediaryId.
export const orgAdminProcedure = orgProcedure.use(({ ctx, next }) => {
  if (ctx.orgRole !== "org:admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin role required" });
  }
  return next({ ctx });
});
