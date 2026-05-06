import type { ChemicalInventoryItem } from "@pest-patrol/types";
import { describe, expect, it } from "vitest";

import {
  filterChemicalInventory,
  getInventorySummary,
  validateChemicalInventoryInput,
  validateChemicalLogInput,
} from "./inventory";

const now = "2026-05-05T00:00:00Z";

describe("inventory domain", () => {
  it("rejects a missing chemical name", () => {
    expect(() =>
      validateChemicalInventoryInput({
        name: " ",
        current_stock: 10,
        unit: "oz",
      }),
    ).toThrow("Chemical name is required");
  });

  it("rejects negative stock values", () => {
    expect(() =>
      validateChemicalInventoryInput({
        name: "Bait",
        current_stock: -1,
        unit: "oz",
      }),
    ).toThrow("Current stock must be zero or greater");
  });

  it("normalizes chemical inventory input", () => {
    const result = validateChemicalInventoryInput({
      name: "  Bait Gel ",
      epa_number: " EPA-123 ",
      current_stock: 12,
      unit: "oz",
      reorder_level: 4,
    });

    expect(result).toEqual({
      name: "Bait Gel",
      epa_number: "EPA-123",
      current_stock: 12,
      unit: "oz",
      reorder_level: 4,
    });
  });

  it("rejects invalid chemical logs", () => {
    expect(() =>
      validateChemicalLogInput({
        job_id: "",
        chemical_id: "chemical-1",
        amount_used: 1,
      }),
    ).toThrow("Job is required");
    expect(() =>
      validateChemicalLogInput({
        job_id: "job-1",
        chemical_id: "chemical-1",
        amount_used: 0,
      }),
    ).toThrow("Amount used must be greater than zero");
  });

  it("filters inventory and summarizes low stock", () => {
    const items = [
      {
        id: "chemical-1",
        name: "Bait Gel",
        epa_number: "EPA-123",
        current_stock: 2,
        unit: "oz",
        reorder_level: 4,
        status: "active",
        created_at: now,
        updated_at: now,
      },
      {
        id: "chemical-2",
        name: "Old Spray",
        epa_number: null,
        current_stock: 20,
        unit: "gal",
        reorder_level: null,
        status: "archived",
        created_at: now,
        updated_at: now,
      },
    ] satisfies ChemicalInventoryItem[];

    expect(filterChemicalInventory(items, "EPA-123", "active")).toHaveLength(1);
    expect(filterChemicalInventory(items, "", "archived")).toHaveLength(1);
    expect(getInventorySummary(items)).toEqual({
      activeCount: 1,
      archivedCount: 1,
      lowStockCount: 1,
      totalStock: 2,
    });
  });
});
