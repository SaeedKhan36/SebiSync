import { beforeEach, describe, expect, it, vi } from "vitest";
import { TRPCError } from "@trpc/server";

const writeAuditLog = vi.fn();
vi.mock("../../lib/audit", () => ({ writeAuditLog }));

const { appRouter } = await import("../router");
const { prisma } = await import("@sebi/db");

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
    vi.spyOn(prisma.client, "create").mockImplementation(() => Promise.resolve({} as never));
    vi.spyOn(prisma.client, "update").mockImplementation(() => Promise.resolve({} as never));
    vi.spyOn(prisma.client, "findUniqueOrThrow");
  });

  it("create injects intermediaryId from ctx (never from input) and writes a CREATED audit entry", async () => {
    vi.mocked(prisma.client.create).mockResolvedValue({
      id: "client_1",
      name: "Acme",
      onboardedAt: null,
    } as never);

    const caller = appRouter.createCaller(makeCtx());
    await caller.client.create({ name: "Acme" });

    expect(prisma.client.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ intermediaryId: "int_1" }) }),
    );
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "CREATED", entityType: "Client", intermediaryId: "int_1" }),
    );
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
    expect(prisma.client.create).not.toHaveBeenCalled();
  });
});

// Sanity: confirms our mock is a real TRPCError subclass, not a plain object.
describe("TRPCError import sanity", () => {
  it("is constructible", () => {
    expect(new TRPCError({ code: "FORBIDDEN" })).toBeInstanceOf(Error);
  });
});
