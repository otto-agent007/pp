import type { InventoryPort } from "./ports";
import type {
  ChemicalInventoryInput,
  ChemicalLogInput,
} from "@pest-patrol/types";
import {
  requireNonEmpty,
  validateChemicalInventoryInput,
  validateChemicalLogInput,
} from "@pest-patrol/domain";

export async function listChemicalInventory(port: InventoryPort) {
  return port.listChemicalInventoryRecords();
}

export async function listChemicalInventoryForClient(port: InventoryPort) {
  return port.listChemicalInventoryRecords();
}

export async function createChemicalInventory(
  port: InventoryPort,
  input: ChemicalInventoryInput,
) {
  return port.createChemicalInventoryRecord(
    validateChemicalInventoryInput(input),
  );
}

export async function updateChemicalInventory(
  port: InventoryPort,
  id: string,
  input: ChemicalInventoryInput,
) {
  return port.updateChemicalInventoryRecord(
    id,
    validateChemicalInventoryInput(input),
  );
}

export async function archiveChemicalInventory(
  port: InventoryPort,
  id: string,
) {
  return port.archiveChemicalInventoryRecord(id);
}

export async function listChemicalLogs(port: InventoryPort) {
  return port.listChemicalLogRecords();
}

export async function listChemicalLogsForClient(port: InventoryPort) {
  return port.listChemicalLogRecords();
}

export async function listJobChemicalLogs(port: InventoryPort, jobId: string) {
  return port.listJobChemicalLogRecords(requireNonEmpty(jobId, "Job"));
}

export async function listJobChemicalLogsForClient(
  jobId: string,
  port: InventoryPort,
) {
  return port.listJobChemicalLogRecords(requireNonEmpty(jobId, "Job"));
}

export async function createChemicalLog(
  port: InventoryPort,
  input: ChemicalLogInput,
) {
  return port.createChemicalLogRecord(validateChemicalLogInput(input));
}

export async function createChemicalLogForClient(
  input: ChemicalLogInput,
  port: InventoryPort,
) {
  return port.createChemicalLogRecord(validateChemicalLogInput(input));
}
