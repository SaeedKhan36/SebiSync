import { prisma } from "@sebi/db";

// No auth/session yet — Clerk org context can be layered on later via a header.
export function createContext() {
  return { prisma };
}

export type Context = ReturnType<typeof createContext>;
