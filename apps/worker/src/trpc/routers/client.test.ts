import { beforeEach, describe, expect, it, vi } from "vitest";
import { TRPCError } from "@trpc/server";

const writeAuditLog = vi.fn();
vi.mock("../../lib/audit", () => ({ writeAuditLog }));

const backfillClientChecklists = vi.fn();
vi.mock("../../services/backfillClientChecklists", () => ({ backfillClientChecklists }));

const { appRouter } = await import("../router");
const { prisma } = await import("@sebi/db");

const txCreate = vi.fn();
const tx = { client: { create: txCreate } };

function makeCtx(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    prisma,
    userId: "user_1",
    orgId: "org_1",
    orgRole: "org:member",
    intermediaryId: "int_1",
    ...overrides,
  } as never;
}

describe("clientRouter", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    writeAuditLog.mockReset().mockResolvedValue({});
    backfillClientChecklists.mockReset().mockResolvedValue(0);
    txCreate.mockReset().mockResolvedValue({});
    vi.spyOn(prisma.client, "update").mockImplementation(() => Promise.resolve({} as never));
    vi.spyOn(prisma.client, "findUniqueOrThrow");
    vi.spyOn(prisma.client, "create");
    // Pass a plain tx object — handing `prisma` back into the callback recurses
    // through PrismaClient's proxy via $transaction.
    vi.spyOn(prisma, "$transaction").mockImplementation(((fn: (client: typeof tx) => unknown) =>
      Promise.resolve(fn(tx))) as never);
  });

  it("create injects intermediaryId from ctx (never from input) and writes a CREATED audit entry", async () => {
    txCreate.mockResolvedValue({
      id: "client_1",
      name: "Acme",
      onboardedAt: null,
    });

    const caller = appRouter.createCaller(makeCtx());
    await caller.client.create({ name: "Acme" });

    expect(prisma.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ timeout: 15_000 }),
    );
    expect(txCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ intermediaryId: "int_1" }) }),
    );
    expect(backfillClientChecklists).toHaveBeenCalledWith(tx, "client_1");
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "CREATED", entityType: "Client", intermediaryId: "int_1" }),
    );
  });

  it("create backfills published obligations and audits checklist items when any are created", async () => {
    txCreate.mockResolvedValue({
      id: "client_1",
      name: "Acme",
      onboardedAt: null,
    });
    backfillClientChecklists.mockResolvedValue(2);

    const caller = appRouter.createCaller(makeCtx());
    await caller.client.create({ name: "Acme" });

    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "CHECKLIST_ITEMS_CREATED",
        entityType: "ChecklistItem",
        metadata: { clientId: "client_1", count: 2 },
      }),
    );
  });

  it("create does not write a CREATED audit when backfill fails", async () => {
    txCreate.mockResolvedValue({
      id: "client_1",
      name: "Acme",
      onboardedAt: null,
    });
    backfillClientChecklists.mockRejectedValue(new Error("db down"));

    const caller = appRouter.createCaller(makeCtx());

    await expect(caller.client.create({ name: "Acme" })).rejects.toThrow("db down");
    expect(writeAuditLog).not.toHaveBeenCalled();
  });

  it("update on a client owned by another org throws FORBIDDEN and never writes", async () => {
    vi.mocked(prisma.client.findUniqueOrThrow).mockResolvedValue({
      id: "client_1",
      intermediaryId: "other_org",
      name: "Acme",
      onboardedAt: null,
    } as never);

    const caller = appRouter.createCaller(makeCtx());

    await expect(caller.client.update({ id: "client_1", name: "Acme Renamed" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(prisma.client.update).not.toHaveBeenCalled();
    expect(writeAuditLog).not.toHaveBeenCalled();
  });

  it("rejects with FORBIDDEN when the caller's org has no provisioned intermediary", async () => {
    const caller = appRouter.createCaller(makeCtx({ intermediaryId: null }));

    await expect(caller.client.create({ name: "Acme" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(txCreate).not.toHaveBeenCalled();
    expect(backfillClientChecklists).not.toHaveBeenCalled();
  });
});

// Sanity: confirms our mock is a real TRPCError subclass, not a plain object.
describe("TRPCError import sanity", () => {
  it("is constructible", () => {
    expect(new TRPCError({ code: "FORBIDDEN" })).toBeInstanceOf(Error);
  });
});
