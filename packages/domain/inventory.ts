import {
  archiveChemicalInventoryRecord,
  createChemicalInventoryRecord,
  createChemicalLogRecord,
  listChemicalInventoryRecords,
  listJobChemicalLogRecords,
  listChemicalLogRecords,
  updateChemicalInventoryRecord,
} from "@pest-patrol/api-client";
import type { AuthSupabaseClient } from "@pest-patrol/api-client";
import type {
  ChemicalInventoryInput,
  ChemicalInventoryItem,
  ChemicalLogInput,
  InventoryStatus,
  InventoryUnit,
} from "@pest-patrol/types";

const inventoryUnits: InventoryUnit[] = ["oz", "gal", "lb", "each"];

function normalizeOptional(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function requireNonEmpty(value: string, fieldName: string) {
  if (!value.trim()) {
    throw new Error(`${fieldName} is required`);
  }

  return value.trim();
}

function requireNonNegative(value: number, fieldName: string) {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${fieldName} must be zero or greater`);
  }

  return value;
}

function requirePositive(value: number, fieldName: string) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${fieldName} must be greater than zero`);
  }

  return value;
}

function normalizeUnit(unit: InventoryUnit) {
  if (!inventoryUnits.includes(unit)) {
    throw new Error("Inventory unit is invalid");
  }

  return unit;
}

export function normalizeChemicalInventoryInput(
  input: ChemicalInventoryInput,
): ChemicalInventoryInput {
  return {
    name: requireNonEmpty(input.name, "Chemical name"),
    epa_number: normalizeOptional(input.epa_number),
    current_stock: requireNonNegative(input.current_stock, "Current stock"),
    unit: normalizeUnit(input.unit),
    reorder_level:
      input.reorder_level === null || input.reorder_level === undefined
        ? null
        : requireNonNegative(input.reorder_level, "Reorder level"),
  };
}

export function validateChemicalInventoryInput(input: ChemicalInventoryInput) {
  return normalizeChemicalInventoryInput(input);
}

export function normalizeChemicalLogInput(input: ChemicalLogInput): ChemicalLogInput {
  return {
    job_id: requireNonEmpty(input.job_id, "Job"),
    chemical_id: requireNonEmpty(input.chemical_id, "Chemical"),
    amount_used: requirePositive(input.amount_used, "Amount used"),
    notes: normalizeOptional(input.notes),
  };
}

export function validateChemicalLogInput(input: ChemicalLogInput) {
  return normalizeChemicalLogInput(input);
}

export function filterChemicalInventory(
  items: ChemicalInventoryItem[],
  search: string,
  status: InventoryStatus | "all",
) {
  const query = search.trim().toLowerCase();

  return items.filter((item) => {
    if (status !== "all" && item.status !== status) {
      return false;
    }

    if (!query) {
      return true;
    }

    return [item.name, item.epa_number, item.unit]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(query);
  });
}

export function getInventorySummary(items: ChemicalInventoryItem[]) {
  const activeItems = items.filter((item) => item.status === "active");
  const lowStockItems = activeItems.filter(
    (item) => item.reorder_level !== null && item.current_stock <= item.reorder_level,
  );

  return {
    activeCount: activeItems.length,
    archivedCount: items.length - activeItems.length,
    lowStockCount: lowStockItems.length,
    totalStock: activeItems.reduce((total, item) => total + item.current_stock, 0),
  };
}

export async function listChemicalInventory() {
  return listChemicalInventoryRecords();
}

export async function listChemicalInventoryForClient(client: AuthSupabaseClient) {
  return listChemicalInventoryRecords(client);
}

export async function createChemicalInventory(input: ChemicalInventoryInput) {
  return createChemicalInventoryRecord(validateChemicalInventoryInput(input));
}

export async function updateChemicalInventory(id: string, input: ChemicalInventoryInput) {
  return updateChemicalInventoryRecord(id, validateChemicalInventoryInput(input));
}

export async function archiveChemicalInventory(id: string) {
  return archiveChemicalInventoryRecord(id);
}

export async function listChemicalLogs() {
  return listChemicalLogRecords();
}

export async function listChemicalLogsForClient(client: AuthSupabaseClient) {
  return listChemicalLogRecords(client);
}

export async function listJobChemicalLogs(jobId: string) {
  return listJobChemicalLogRecords(requireNonEmpty(jobId, "Job"));
}

export async function listJobChemicalLogsForClient(
  jobId: string,
  client: AuthSupabaseClient,
) {
  return listJobChemicalLogRecords(requireNonEmpty(jobId, "Job"), client);
}

export async function createChemicalLog(input: ChemicalLogInput) {
  return createChemicalLogRecord(validateChemicalLogInput(input));
}

export async function createChemicalLogForClient(
  input: ChemicalLogInput,
  client: AuthSupabaseClient,
) {
  return createChemicalLogRecord(validateChemicalLogInput(input), client);
}
