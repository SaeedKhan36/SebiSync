import { beforeEach, describe, expect, it, vi } from "vitest";

const writeAuditLog = vi.fn();
vi.mock("../../lib/audit", () => ({ writeAuditLog }));

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

function pendingReviewItem(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "item_1",
    intermediaryId: "int_1",
    status: "PENDING_REVIEW",
    ...overrides,
  };
}

describe("checklistRouter.approve / updateStatus", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    writeAuditLog.mockReset().mockResolvedValue({});
    vi.spyOn(prisma.complianceChecklistItem, "findUniqueOrThrow");
    vi.spyOn(prisma.complianceChecklistItem, "update").mockImplementation(
      ({ where, data }: never) =>
        Promise.resolve({ id: (where as { id: string }).id, intermediaryId: "int_1", ...(data as object) } as never),
    );
    vi.spyOn(prisma.evidenceRecord, "count").mockResolvedValue(1);
  });

  it("approve → FORBIDDEN when orgRole is org:member", async () => {
    const caller = appRouter.createCaller(makeCtx({ orgRole: "org:member" }));

    await expect(caller.checklist.approve({ id: "item_1" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(prisma.complianceChecklistItem.findUniqueOrThrow).not.toHaveBeenCalled();
  });

  it("approve → BAD_REQUEST when status isn't PENDING_REVIEW", async () => {
    vi.mocked(prisma.complianceChecklistItem.findUniqueOrThrow).mockResolvedValue(
      pendingReviewItem({ status: "PENDING" }) as never,
    );

    const caller = appRouter.createCaller(makeCtx());

    await expect(caller.checklist.approve({ id: "item_1" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    expect(prisma.complianceChecklistItem.update).not.toHaveBeenCalled();
  });

  it("approve → BAD_REQUEST when there are no evidence records", async () => {
    vi.mocked(prisma.complianceChecklistItem.findUniqueOrThrow).mockResolvedValue(
      pendingReviewItem() as never,
    );
    vi.mocked(prisma.evidenceRecord.count).mockResolvedValue(0);

    const caller = appRouter.createCaller(makeCtx());

    await expect(caller.checklist.approve({ id: "item_1" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    expect(prisma.complianceChecklistItem.update).not.toHaveBeenCalled();
  });

  it("approve → sets COMPLIANT and writes an EVIDENCE_APPROVED audit entry", async () => {
    vi.mocked(prisma.complianceChecklistItem.findUniqueOrThrow).mockResolvedValue(
      pendingReviewItem() as never,
    );

    const caller = appRouter.createCaller(makeCtx());
    await caller.checklist.approve({ id: "item_1" });

    expect(prisma.complianceChecklistItem.update).toHaveBeenCalledWith({
      where: { id: "item_1" },
      data: { status: "COMPLIANT" },
    });
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "EVIDENCE_APPROVED",
        actorType: "USER",
        checklistItemId: "item_1",
        beforeState: { status: "PENDING_REVIEW" },
        afterState: { status: "COMPLIANT" },
      }),
    );
  });

  it("approve → FORBIDDEN on an item belonging to another org", async () => {
    vi.mocked(prisma.complianceChecklistItem.findUniqueOrThrow).mockResolvedValue(
      pendingReviewItem({ intermediaryId: "other_org" }) as never,
    );

    const caller = appRouter.createCaller(makeCtx());

    await expect(caller.checklist.approve({ id: "item_1" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(prisma.complianceChecklistItem.update).not.toHaveBeenCalled();
    expect(writeAuditLog).not.toHaveBeenCalled();
  });

  it("updateStatus → FORBIDDEN for COMPLIANT even as admin", async () => {
    vi.mocked(prisma.complianceChecklistItem.findUniqueOrThrow).mockResolvedValue(
      pendingReviewItem({ status: "PENDING" }) as never,
    );

    const caller = appRouter.createCaller(makeCtx());

    await expect(caller.checklist.updateStatus({ id: "item_1", status: "COMPLIANT" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(prisma.complianceChecklistItem.update).not.toHaveBeenCalled();
  });

  it("updateStatus → FORBIDDEN for NOT_APPLICABLE as member, allowed as admin", async () => {
    vi.mocked(prisma.complianceChecklistItem.findUniqueOrThrow).mockResolvedValue(
      pendingReviewItem({ status: "PENDING" }) as never,
    );

    const member = appRouter.createCaller(makeCtx({ orgRole: "org:member" }));
    await expect(
      member.checklist.updateStatus({ id: "item_1", status: "NOT_APPLICABLE" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    const admin = appRouter.createCaller(makeCtx({ orgRole: "org:admin" }));
    await admin.checklist.updateStatus({ id: "item_1", status: "NOT_APPLICABLE" });
    expect(prisma.complianceChecklistItem.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "NOT_APPLICABLE" }) }),
    );
  });
});
