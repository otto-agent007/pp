import {
  archiveChemicalInventoryRecord,
  createChemicalInventoryRecord,
  createChemicalLogRecord,
  listChemicalInventoryRecords,
  listChemicalLogRecords,
  listJobChemicalLogRecords,
  updateChemicalInventoryRecord,
} from "@pest-patrol/api-client";
import type { AuthSupabaseClient } from "@pest-patrol/api-client";
import type {
  ChemicalInventoryInput,
  ChemicalLogInput,
} from "@pest-patrol/types";
import {
  requireNonEmpty,
  validateChemicalInventoryInput,
  validateChemicalLogInput,
} from "@pest-patrol/domain";

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
