import type {
  TechnicianLicense,
  TechnicianLicenseInput,
} from "@pest-patrol/types";
import type { AuthSupabaseClient } from "./auth";

import { supabase } from "./supabase";

type TechnicianLicensesClient = typeof supabase | AuthSupabaseClient;
type TechnicianLicenseRow = TechnicianLicense;

export function isTechnicianLicenseSchemaUnavailableError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as { code?: string; message?: string };
  const message = candidate.message ?? "";

  return candidate.code === "42P01" && /technician_licenses/i.test(message);
}

function toTechnicianLicenseRow(input: TechnicianLicenseInput) {
  return {
    branch: input.branch,
    expires_at: input.expires_at ?? null,
    issuing_authority: input.issuing_authority ?? "spcb",
    license_number: input.license_number,
    license_type: input.license_type,
    notes: input.notes ?? null,
    status: input.status ?? "active",
    technician_id: input.technician_id,
  };
}

export async function listTechnicianLicenseRecords(
  technicianId?: string,
  client: TechnicianLicensesClient = supabase,
) {
  let query = client
    .from("technician_licenses")
    .select("*")
    .is("archived_at", null)
    .order("expires_at", { ascending: true })
    .order("created_at", { ascending: false });

  if (technicianId) {
    query = query.eq("technician_id", technicianId);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []) as TechnicianLicense[];
}

export async function createTechnicianLicenseRecord(
  input: TechnicianLicenseInput,
  client: TechnicianLicensesClient = supabase,
) {
  const { data, error } = await client
    .from("technician_licenses")
    .insert(toTechnicianLicenseRow(input))
    .select("*")
    .single<TechnicianLicenseRow>();

  if (error) {
    throw error;
  }

  return data as TechnicianLicense;
}

export async function updateTechnicianLicenseRecord(
  id: string,
  input: TechnicianLicenseInput,
  client: TechnicianLicensesClient = supabase,
) {
  const { data, error } = await client
    .from("technician_licenses")
    .update(toTechnicianLicenseRow(input))
    .eq("id", id)
    .select("*")
    .single<TechnicianLicenseRow>();

  if (error) {
    throw error;
  }

  return data as TechnicianLicense;
}

export async function archiveTechnicianLicenseRecord(
  id: string,
  client: TechnicianLicensesClient = supabase,
) {
  const { data, error } = await client
    .from("technician_licenses")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single<TechnicianLicenseRow>();

  if (error) {
    throw error;
  }

  return data as TechnicianLicense;
}
