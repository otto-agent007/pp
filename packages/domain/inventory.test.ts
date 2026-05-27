import type { ChemicalInventoryItem, ChemicalLog } from "@pest-patrol/types";
import { describe, expect, it } from "vitest";

import {
  buildInventoryCockpitRows,
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

  it("builds product cockpit rows from inventory and chemical logs", () => {
    const bait = {
      id: "chemical-1",
      name: "Demo - Ant Gel Bait Rotation A",
      epa_number: "DEMO-499-548",
      current_stock: 4,
      unit: "each",
      reorder_level: 8,
      status: "active",
      created_at: now,
      updated_at: now,
    } satisfies ChemicalInventoryItem;
    const glueboard = {
      id: "chemical-2",
      name: "Demo - Glueboard Monitor 72 Pack",
      epa_number: "N/A",
      current_stock: 30,
      unit: "each",
      reorder_level: 12,
      status: "active",
      created_at: now,
      updated_at: now,
    } satisfies ChemicalInventoryItem;
    const rows = buildInventoryCockpitRows(
      [bait, glueboard],
      [
        {
          id: "log-1",
          amount_used: 1,
          chemical_id: bait.id,
          created_at: "2026-05-14T10:00:00.000Z",
          job_id: "job-1",
          notes: null,
          job: {
            id: "job-1",
            assigned_tech_id: null,
            created_at: now,
            customer: {
              id: "customer-1",
              created_at: now,
              email: null,
              name: "Demo - Rivera Cafe",
              phone: null,
              property_type: "commercial",
              service_notes: null,
              status: "active",
              updated_at: now,
            },
            customer_id: "customer-1",
            location_id: "location-1",
            scheduled_end: null,
            scheduled_start: now,
            service_notes: null,
            status: "completed",
            updated_at: now,
          },
        },
      ] satisfies ChemicalLog[],
    );

    expect(rows[0]).toMatchObject({
      id: bait.id,
      latestCustomerName: "Demo - Rivera Cafe",
      nextActionLabel: "Reorder now",
      statusTone: "danger",
      stockState: "reorder",
      usageCount: 1,
    });
    expect(rows[0].recentLogs).toHaveLength(1);
    expect(rows[1]).toMatchObject({
      id: glueboard.id,
      nextActionLabel: "Add EPA detail",
      statusTone: "warning",
      stockState: "ready",
      usageCount: 0,
    });
  });
});
