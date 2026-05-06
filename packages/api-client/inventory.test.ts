import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  archiveChemicalInventoryRecord,
  createChemicalInventoryRecord,
  createChemicalLogRecord,
  listChemicalInventoryRecords,
  listJobChemicalLogRecords,
  listChemicalLogRecords,
  updateChemicalInventoryRecord,
} from "./inventory";
import { supabase } from "./supabase";

vi.mock("./supabase", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

class MockQuery<T> {
  calls: Array<[string, unknown[]]> = [];

  constructor(private result: T) {}

  select(...args: unknown[]) {
    this.calls.push(["select", args]);
    return this;
  }

  order(...args: unknown[]) {
    this.calls.push(["order", args]);
    return this;
  }

  insert(...args: unknown[]) {
    this.calls.push(["insert", args]);
    return this;
  }

  update(...args: unknown[]) {
    this.calls.push(["update", args]);
    return this;
  }

  eq(...args: unknown[]) {
    this.calls.push(["eq", args]);
    return this;
  }

  single() {
    this.calls.push(["single", []]);
    return Promise.resolve(this.result);
  }

  then(resolve: (value: T) => unknown, reject: (error: unknown) => unknown) {
    return Promise.resolve(this.result).then(resolve, reject);
  }
}

const now = "2026-05-05T00:00:00Z";
const chemical = {
  id: "chemical-1",
  name: "Bait Gel",
  epa_number: "EPA-123",
  current_stock: 12,
  unit: "oz",
  reorder_level: 4,
  status: "active",
  created_at: now,
  updated_at: now,
};
const log = {
  id: "log-1",
  job_id: "job-1",
  chemical_id: "chemical-1",
  amount_used: 2,
  notes: null,
  created_at: now,
  chemical,
};

describe("inventory api client", () => {
  const from = vi.mocked(supabase.from);

  beforeEach(() => {
    from.mockReset();
  });

  it("lists chemical inventory", async () => {
    const inventoryQuery = new MockQuery({ data: [chemical], error: null });
    from.mockReturnValue(inventoryQuery as never);

    const inventory = await listChemicalInventoryRecords();

    expect(inventory).toHaveLength(1);
    expect(from).toHaveBeenCalledWith("chemical_inventory");
    expect(inventoryQuery.calls).toContainEqual(["select", ["*"]]);
  });

  it("creates and updates chemical inventory", async () => {
    const createQuery = new MockQuery({ data: chemical, error: null });
    const updateQuery = new MockQuery({ data: chemical, error: null });
    from.mockReturnValueOnce(createQuery as never).mockReturnValueOnce(updateQuery as never);

    await createChemicalInventoryRecord({
      name: "Bait Gel",
      epa_number: "EPA-123",
      current_stock: 12,
      unit: "oz",
      reorder_level: 4,
    });
    await updateChemicalInventoryRecord("chemical-1", {
      name: "Bait Gel",
      epa_number: "EPA-123",
      current_stock: 10,
      unit: "oz",
      reorder_level: 4,
    });

    expect(createQuery.calls[0]).toEqual([
      "insert",
      [expect.objectContaining({ name: "Bait Gel", status: "active" })],
    ]);
    expect(updateQuery.calls).toContainEqual(["eq", ["id", "chemical-1"]]);
  });

  it("archives chemical inventory", async () => {
    const archiveQuery = new MockQuery({
      data: { ...chemical, status: "archived" },
      error: null,
    });
    from.mockReturnValue(archiveQuery as never);

    const archived = await archiveChemicalInventoryRecord("chemical-1");

    expect(archived.status).toBe("archived");
    expect(archiveQuery.calls[0]).toEqual(["update", [{ status: "archived" }]]);
  });

  it("lists and creates chemical logs", async () => {
    const listQuery = new MockQuery({ data: [log], error: null });
    const createQuery = new MockQuery({ data: log, error: null });
    from.mockReturnValueOnce(listQuery as never).mockReturnValueOnce(createQuery as never);

    const logs = await listChemicalLogRecords();
    await createChemicalLogRecord({
      job_id: "job-1",
      chemical_id: "chemical-1",
      amount_used: 2,
      notes: null,
    });

    expect(logs).toHaveLength(1);
    expect(from).toHaveBeenCalledWith("chemical_logs");
    expect(createQuery.calls[0]).toEqual([
      "insert",
      [
        expect.objectContaining({
          job_id: "job-1",
          chemical_id: "chemical-1",
          amount_used: 2,
        }),
      ],
    ]);
  });

  it("lists chemical logs for a job", async () => {
    const listQuery = new MockQuery({ data: [log], error: null });
    from.mockReturnValue(listQuery as never);

    const logs = await listJobChemicalLogRecords("job-1");

    expect(logs).toHaveLength(1);
    expect(from).toHaveBeenCalledWith("chemical_logs");
    expect(listQuery.calls).toContainEqual(["eq", ["job_id", "job-1"]]);
  });

  it("creates chemical logs with an authenticated client", async () => {
    const createQuery = new MockQuery({ data: log, error: null });
    const clientFrom = vi.fn().mockReturnValue(createQuery);
    const client = { from: clientFrom } as never;

    await createChemicalLogRecord(
      {
        job_id: "job-1",
        chemical_id: "chemical-1",
        amount_used: 2,
        notes: "Crack and crevice",
      },
      client,
    );

    expect(clientFrom).toHaveBeenCalledWith("chemical_logs");
    expect(createQuery.calls[0]).toEqual([
      "insert",
      [
        {
          job_id: "job-1",
          chemical_id: "chemical-1",
          amount_used: 2,
          notes: "Crack and crevice",
        },
      ],
    ]);
  });
});
