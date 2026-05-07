import type {
  TechnicianInviteInput,
  TechnicianInviteResult,
  TechnicianProfile,
  TechnicianStatus,
} from "@pest-patrol/types";
import type { AuthSupabaseClient } from "./auth";

import { supabase } from "./supabase";

type TechniciansClient = typeof supabase | AuthSupabaseClient;

interface TechnicianInviteRecordInput extends TechnicianInviteInput {
  redirect_to: string;
}

async function getAccessToken() {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  return data.session?.access_token ?? null;
}

export async function listTechnicianProfileRecords(
  status?: TechnicianStatus,
  client: TechniciansClient = supabase,
) {
  let query = client
    .from("profiles")
    .select("*")
    .eq("role", "technician")
    .order("display_name", { ascending: true })
    .order("created_at", { ascending: true });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []) as TechnicianProfile[];
}

export async function inviteTechnicianWithAdminClientRecord(
  client: AuthSupabaseClient,
  input: TechnicianInviteRecordInput,
) {
  const { data, error } = await client.auth.admin.inviteUserByEmail(
    input.email,
    {
      data: {
        display_name: input.display_name ?? null,
        role: "technician",
      },
      redirectTo: input.redirect_to,
    },
  );

  if (error) {
    throw error;
  }

  if (!data.user) {
    throw new Error("Unable to invite technician");
  }

  const { data: profile, error: profileError } = await client
    .from("profiles")
    .upsert(
      {
        id: data.user.id,
        role: "technician",
        email: input.email,
        display_name: input.display_name ?? null,
        status: "active",
      },
      { onConflict: "id" },
    )
    .select("*")
    .single<TechnicianProfile>();

  if (profileError) {
    throw profileError;
  }

  return {
    technician: profile as TechnicianProfile,
  } satisfies TechnicianInviteResult;
}

export async function inviteTechnicianRecord(input: TechnicianInviteInput) {
  const adminAccessToken = await getAccessToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (adminAccessToken) {
    headers.Authorization = `Bearer ${adminAccessToken}`;
  }

  const response = await fetch("/api/technicians", {
    body: JSON.stringify(input),
    headers,
    method: "POST",
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;

    throw new Error(body?.error ?? "Unable to invite technician");
  }

  return (await response.json()) as TechnicianInviteResult;
}
