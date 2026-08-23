import { beforeEach, describe, expect, it, vi } from "vitest";
import { backfillClientChecklists } from "./backfillClientChecklists";

const findUniqueOrThrow = vi.fn();
const findMany = vi.fn();
const createMany = vi.fn();
const update = vi.fn();
const updateMany = vi.fn();
const deleteMany = vi.fn();

const db = {
  client: { findUniqueOrThrow },
  obligation: { findMany },
  complianceChecklistItem: { createMany, update, updateMany, deleteMany },
};

const NEW_CLIENT = {
  id: "client_new",
  intermediaryId: "int_1",
  intermediary: { categoryId: "cat_ia" },
};

describe("backfillClientChecklists", () => {
  beforeEach(() => {
    findUniqueOrThrow.mockReset().mockResolvedValue(NEW_CLIENT);
    findMany.mockReset().mockResolvedValue([]);
    createMany.mockReset().mockResolvedValue({ count: 0 });
    update.mockReset();
    updateMany.mockReset();
    deleteMany.mockReset();
  });

  it("creates the client with zero checklist items when there are no published obligations", async () => {
    findMany.mockResolvedValue([]);

    const count = await backfillClientChecklists(db as never, "client_new");

    expect(count).toBe(0);
    expect(createMany).not.toHaveBeenCalled();
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "PUBLISHED",
          frequency: "PER_CLIENT",
          applicableCategories: { some: { id: "cat_ia" } },
        }),
      }),
    );
  });

  it("creates one checklist item for a single applicable published obligation", async () => {
    findMany.mockResolvedValue([{ id: "ob_1" }]);
    createMany.mockResolvedValue({ count: 1 });

    const count = await backfillClientChecklists(db as never, "client_new");

    expect(count).toBe(1);
    expect(createMany).toHaveBeenCalledWith({
      data: [
        {
          intermediaryId: "int_1",
          obligationId: "ob_1",
          clientId: "client_new",
          status: "PENDING",
        },
      ],
      skipDuplicates: true,
    });
  });

  it("creates one checklist item per applicable published obligation", async () => {
    findMany.mockResolvedValue([{ id: "ob_1" }, { id: "ob_2" }, { id: "ob_3" }]);
    createMany.mockResolvedValue({ count: 3 });

    const count = await backfillClientChecklists(db as never, "client_new");

    expect(count).toBe(3);
    expect(createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [
          expect.objectContaining({ obligationId: "ob_1", clientId: "client_new" }),
          expect.objectContaining({ obligationId: "ob_2", clientId: "client_new" }),
          expect.objectContaining({ obligationId: "ob_3", clientId: "client_new" }),
        ],
        skipDuplicates: true,
      }),
    );
  });

  it("does not create items for obligations that do not apply", async () => {
    // Applicability is enforced in the query (PUBLISHED + PER_CLIENT + matching
    // category). A mix of inapplicable obligations therefore never reaches
    // createMany — findMany returns only the applicable subset.
    findMany.mockResolvedValue([{ id: "ob_applicable" }]);
    createMany.mockResolvedValue({ count: 1 });

    const count = await backfillClientChecklists(db as never, "client_new");

    expect(count).toBe(1);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: "PUBLISHED",
          frequency: "PER_CLIENT",
          applicableCategories: { some: { id: "cat_ia" } },
        },
      }),
    );
    expect(createMany.mock.calls[0][0].data).toEqual([
      expect.objectContaining({ obligationId: "ob_applicable", clientId: "client_new" }),
    ]);
  });

  it("is idempotent: running the backfill twice does not create duplicates", async () => {
    findMany.mockResolvedValue([{ id: "ob_1" }, { id: "ob_2" }]);
    createMany.mockResolvedValueOnce({ count: 2 }).mockResolvedValueOnce({ count: 0 });

    const first = await backfillClientChecklists(db as never, "client_new");
    const second = await backfillClientChecklists(db as never, "client_new");

    expect(first).toBe(2);
    expect(second).toBe(0);
    expect(createMany).toHaveBeenCalledTimes(2);
    expect(createMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ skipDuplicates: true }),
    );
  });

  it("does not modify existing clients or existing checklist items", async () => {
    findMany.mockResolvedValue([{ id: "ob_1" }]);
    createMany.mockResolvedValue({ count: 1 });

    await backfillClientChecklists(db as never, "client_new");

    expect(update).not.toHaveBeenCalled();
    expect(updateMany).not.toHaveBeenCalled();
    expect(deleteMany).not.toHaveBeenCalled();
    const rows = createMany.mock.calls[0][0].data as Array<{ clientId: string }>;
    expect(rows.every((row) => row.clientId === "client_new")).toBe(true);
  });
});
