import {
  getCurrentAuthRecord,
  signInWithPasswordRecord,
  signOutRecord,
} from "@pest-patrol/api-client";
import type {
  AuthRecord,
  AuthSupabaseClient,
  TechnicianAuthRecord,
} from "@pest-patrol/api-client";

export interface LoginInput {
  email: string;
  password: string;
}

export type TechnicianLoginInput = LoginInput;

function requireNonEmpty(value: string, fieldName: string) {
  if (!value.trim()) {
    throw new Error(`${fieldName} is required`);
  }

  return value.trim();
}

export function validateLoginInput(input: LoginInput) {
  return {
    email: requireNonEmpty(input.email, "Email").toLowerCase(),
    password: requireNonEmpty(input.password, "Password"),
  };
}

export const validateTechnicianLoginInput = validateLoginInput;

export const validateAdminLoginInput = validateLoginInput;

export function validateTechnicianAccess(record: TechnicianAuthRecord | null) {
  if (!record) {
    return null;
  }

  if (record.profile.role !== "technician") {
    throw new Error("Technician access is required");
  }

  return record;
}

export function validateAdminAccess(record: AuthRecord | null) {
  if (!record) {
    return null;
  }

  if (record.profile.role !== "admin" && record.profile.role !== "dispatcher") {
    throw new Error("Admin or dispatcher access is required");
  }

  return record;
}

export async function getCurrentTechnicianAuth(client: AuthSupabaseClient) {
  return validateTechnicianAccess(await getCurrentAuthRecord(client));
}

export async function getCurrentAdminAuth(client: AuthSupabaseClient) {
  return validateAdminAccess(await getCurrentAuthRecord(client));
}

export async function signInTechnician(
  client: AuthSupabaseClient,
  input: TechnicianLoginInput,
) {
  const normalized = validateTechnicianLoginInput(input);

  return validateTechnicianAccess(
    await signInWithPasswordRecord(client, normalized.email, normalized.password),
  );
}

export async function signInAdmin(
  client: AuthSupabaseClient,
  input: LoginInput,
) {
  const normalized = validateAdminLoginInput(input);

  return validateAdminAccess(
    await signInWithPasswordRecord(client, normalized.email, normalized.password),
  );
}

export async function signOutTechnician(client: AuthSupabaseClient) {
  await signOutRecord(client);
}

export async function signOutAdmin(client: AuthSupabaseClient) {
  await signOutRecord(client);
}
