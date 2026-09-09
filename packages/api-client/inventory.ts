import type {
  ChemicalInventoryInput,
  ChemicalInventoryItem,
  ChemicalLog,
  ChemicalLogInput,
} from "@pest-patrol/types";

import type { SupabaseProviderClient } from "./supabase";

type InventoryClient = SupabaseProviderClient;
type ChemicalInventoryRow = ChemicalInventoryItem;
type ChemicalLogRow = ChemicalLog;

function toInventoryRow(input: ChemicalInventoryInput) {
  return {
    name: input.name,
    epa_number: input.epa_number ?? null,
    current_stock: input.current_stock,
    unit: input.unit,
    reorder_level: input.reorder_level ?? null,
    status: "active",
  };
}

function toChemicalLogRow(input: ChemicalLogInput) {
  return {
    job_id: input.job_id,
    chemical_id: input.chemical_id,
    amount_used: input.amount_used,
    notes: input.notes ?? null,
  };
}

const chemicalLogSelect =
  "*, chemical:chemical_inventory(*), job:jobs(*, customer:customers(*), location:locations(*))";

export async function listChemicalInventoryRecords(client: InventoryClient) {
  const { data, error } = await client
    .from("chemical_inventory")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as ChemicalInventoryItem[];
}

export async function createChemicalInventoryRecord(
  input: ChemicalInventoryInput,
  client: InventoryClient,
) {
  const { data, error } = await client
    .from("chemical_inventory")
    .insert(toInventoryRow(input))
    .select("*")
    .single<ChemicalInventoryRow>();

  if (error) {
    throw error;
  }

  return data as ChemicalInventoryItem;
}

export async function updateChemicalInventoryRecord(
  id: string,
  input: ChemicalInventoryInput,
  client: InventoryClient,
) {
  const { data, error } = await client
    .from("chemical_inventory")
    .update(toInventoryRow(input))
    .eq("id", id)
    .select("*")
    .single<ChemicalInventoryRow>();

  if (error) {
    throw error;
  }

  return data as ChemicalInventoryItem;
}

export async function archiveChemicalInventoryRecord(
  id: string,
  client: InventoryClient,
) {
  const { data, error } = await client
    .from("chemical_inventory")
    .update({ status: "archived" })
    .eq("id", id)
    .select("*")
    .single<ChemicalInventoryRow>();

  if (error) {
    throw error;
  }

  return data as ChemicalInventoryItem;
}

export async function listChemicalLogRecords(client: InventoryClient) {
  const { data, error } = await client
    .from("chemical_logs")
    .select(chemicalLogSelect)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as ChemicalLog[];
}

export async function listJobChemicalLogRecords(
  jobId: string,
  client: InventoryClient,
) {
  const { data, error } = await client
    .from("chemical_logs")
    .select(chemicalLogSelect)
    .eq("job_id", jobId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as ChemicalLog[];
}

export async function createChemicalLogRecord(
  input: ChemicalLogInput,
  client: InventoryClient,
) {
  const { data, error } = await client
    .from("chemical_logs")
    .insert(toChemicalLogRow(input))
    .select(chemicalLogSelect)
    .single<ChemicalLogRow>();

  if (error) {
    throw error;
  }

  return data as ChemicalLog;
}
