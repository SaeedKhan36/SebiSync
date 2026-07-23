import { beforeEach, describe, expect, it, vi } from "vitest";

const writeAuditLog = vi.fn();
vi.mock("../../lib/audit", () => ({ writeAuditLog }));

const trigger = vi.fn();
vi.mock("../../queue/tasks/propagate-obligation", () => ({
  propagateObligationTask: { trigger },
}));

const { appRouter } = await import("../router");
const { prisma } = await import("@sebi/db");

function makeCtx(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    prisma,
    userId: "user_1",
    orgId: "org_1",
    orgRole: "org:admin",
    intermediaryId: "int_1",
    ...overrides,
  } as never;
}

describe("obligationRouter.publish", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    writeAuditLog.mockReset().mockResolvedValue({});
    trigger.mockReset();
    vi.spyOn(prisma.obligation, "findUniqueOrThrow");
    vi.spyOn(prisma.obligation, "update").mockImplementation(
      ({ where, data }: never) => Promise.resolve({ id: (where as { id: string }).id, ...(data as object) } as never),
    );
  });

  it("rejects with BAD_REQUEST when the obligation is not DRAFT", async () => {
    vi.mocked(prisma.obligation.findUniqueOrThrow).mockResolvedValue({
      id: "ob_1",
      status: "PUBLISHED",
    } as never);

    const caller = appRouter.createCaller(makeCtx());

    await expect(caller.obligation.publish({ id: "ob_1" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    expect(trigger).not.toHaveBeenCalled();
  });

  it("rejects with FORBIDDEN for a non-admin caller", async () => {
    const caller = appRouter.createCaller(makeCtx({ orgRole: "org:member" }));

    await expect(caller.obligation.publish({ id: "ob_1" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(prisma.obligation.findUniqueOrThrow).not.toHaveBeenCalled();
  });

  it("publishes, triggers fan-out with an idempotency key, and persists the run id", async () => {
    vi.mocked(prisma.obligation.findUniqueOrThrow).mockResolvedValue({
      id: "ob_1",
      status: "DRAFT",
    } as never);
    trigger.mockResolvedValue({ id: "run_1" });

    const caller = appRouter.createCaller(makeCtx());
    await caller.obligation.publish({ id: "ob_1" });

    expect(prisma.obligation.update).toHaveBeenNthCalledWith(1, {
      where: { id: "ob_1" },
      data: { status: "PUBLISHED", reviewedByUserId: "user_1", fanOutStatus: "PENDING" },
    });
    expect(trigger).toHaveBeenCalledWith(
      { obligationId: "ob_1" },
      expect.objectContaining({ idempotencyKey: "ob_1" }),
    );
    expect(prisma.obligation.update).toHaveBeenNthCalledWith(2, {
      where: { id: "ob_1" },
      data: { fanOutRunId: "run_1" },
    });
  });

  it("degrades to fanOutStatus FAILED when enqueueing the fan-out task rejects", async () => {
    vi.mocked(prisma.obligation.findUniqueOrThrow).mockResolvedValue({
      id: "ob_1",
      status: "DRAFT",
    } as never);
    trigger.mockRejectedValue(new Error("trigger.dev outage"));

    const caller = appRouter.createCaller(makeCtx());
    await caller.obligation.publish({ id: "ob_1" });

    expect(prisma.obligation.update).toHaveBeenNthCalledWith(2, {
      where: { id: "ob_1" },
      data: { fanOutStatus: "FAILED", fanOutError: "trigger.dev outage" },
    });
  });
});
