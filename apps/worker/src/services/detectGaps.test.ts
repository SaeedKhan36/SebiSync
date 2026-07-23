import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const findMany = vi.fn();
const gapFindFirst = vi.fn();
const gapCreate = vi.fn();
const gapUpdate = vi.fn();
const checklistItemUpdate = vi.fn();
const auditLogCreate = vi.fn();
const notifyGapMock = vi.fn();

vi.mock("@sebi/db", () => ({
  prisma: {
    complianceChecklistItem: { findMany, update: checklistItemUpdate },
    complianceGap: { findFirst: gapFindFirst, create: gapCreate, update: gapUpdate },
    auditLogEntry: { create: auditLogCreate },
  },
}));

vi.mock("./notifyGap", () => ({ notifyGap: notifyGapMock }));

const { detectGaps } = await import("./detectGaps");

function overdueItem(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "item_1",
    intermediaryId: "int_1",
    createdAt: new Date("2025-01-01T00:00:00Z"),
    dueDate: new Date("2025-06-01T00:00:00Z"), // well in the past relative to "now" below
    evidenceRecords: [],
    obligation: { code: "IA-01", title: "Risk profiling manual" },
    client: { name: "Asha Rao" },
    intermediary: { clerkOrgId: "org_1" },
    ...overrides,
  };
}

describe("detectGaps", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    findMany.mockReset().mockResolvedValue([]);
    gapFindFirst.mockReset().mockResolvedValue(null);
    gapCreate.mockReset().mockResolvedValue({ id: "gap_1", checklistItemId: "item_1" });
    gapUpdate.mockReset().mockResolvedValue({});
    checklistItemUpdate.mockReset().mockResolvedValue({});
    auditLogCreate.mockReset().mockResolvedValue({});
    notifyGapMock.mockReset().mockResolvedValue(0);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("creates a gap, marks the item GAP, and writes a GAP_DETECTED audit entry", async () => {
    findMany.mockResolvedValue([overdueItem()]);

    const result = await detectGaps();

    expect(result).toEqual({ created: 1 });
    expect(gapCreate).toHaveBeenCalledOnce();
    expect(checklistItemUpdate).toHaveBeenCalledWith({
      where: { id: "item_1" },
      data: { status: "GAP" },
    });
    expect(auditLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: "GAP_DETECTED" }) }),
    );
  });

  it("is idempotent: skips creating a gap when an unresolved one already exists", async () => {
    findMany.mockResolvedValue([overdueItem()]);
    gapFindFirst.mockResolvedValue({ id: "existing_gap" });

    const result = await detectGaps();

    expect(result).toEqual({ created: 0 });
    expect(gapCreate).not.toHaveBeenCalled();
  });

  it("skips notification (and never calls notifyGap) when clerkOrgId is null", async () => {
    findMany.mockResolvedValue([overdueItem({ intermediary: { clerkOrgId: null } })]);

    const result = await detectGaps();

    expect(result).toEqual({ created: 1 });
    expect(notifyGapMock).not.toHaveBeenCalled();
    expect(gapUpdate).not.toHaveBeenCalled();
  });

  it("still resolves successfully when notifyGap throws", async () => {
    findMany.mockResolvedValue([overdueItem()]);
    notifyGapMock.mockRejectedValue(new Error("resend down"));

    const result = await detectGaps();

    expect(result).toEqual({ created: 1 });
    expect(gapUpdate).not.toHaveBeenCalled();
  });

  it("does not set notifiedAt or write a NOTIFIED audit entry when notifyGap returns 0", async () => {
    findMany.mockResolvedValue([overdueItem()]);
    notifyGapMock.mockResolvedValue(0);

    await detectGaps();

    expect(gapUpdate).not.toHaveBeenCalled();
    expect(auditLogCreate).not.toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: "NOTIFIED" }) }),
    );
  });

  it("sets notifiedAt and writes a NOTIFIED audit entry when notifyGap succeeds", async () => {
    findMany.mockResolvedValue([overdueItem()]);
    notifyGapMock.mockResolvedValue(2);

    await detectGaps();

    expect(gapUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "gap_1" }, data: expect.objectContaining({ notifiedAt: expect.any(Date) }) }),
    );
    expect(auditLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: "NOTIFIED" }) }),
    );
  });
});
