import {
  getCurrentAuthRecord,
  resetPasswordForEmailRecord,
  setPasswordRecoverySessionRecord,
  signInWithPasswordRecord,
  signOutRecord,
  updatePasswordRecord,
} from "@pest-patrol/api-client";
import type {
  AuthSupabaseClient,
  TechnicianAuthRecord,
} from "@pest-patrol/api-client";
import type { UserProfile } from "@pest-patrol/types";

export interface LoginInput {
  email: string;
  password: string;
}

export type TechnicianLoginInput = LoginInput;

export interface PasswordResetRequestInput {
  email: string;
  redirectTo: string;
}

export interface PasswordRecoverySessionInput {
  accessToken: string;
  refreshToken: string;
}

export interface PasswordUpdateInput {
  password: string;
  confirmPassword: string;
}

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

export function validatePasswordResetRequestInput(
  input: PasswordResetRequestInput,
) {
  return {
    email: requireNonEmpty(input.email, "Email").toLowerCase(),
    redirectTo: requireNonEmpty(input.redirectTo, "Password reset redirect"),
  };
}

export function validatePasswordRecoverySessionInput(
  input: PasswordRecoverySessionInput,
) {
  return {
    accessToken: requireNonEmpty(input.accessToken, "Recovery access token"),
    refreshToken: requireNonEmpty(input.refreshToken, "Recovery refresh token"),
  };
}

export function validatePasswordUpdateInput(input: PasswordUpdateInput) {
  const password = requireNonEmpty(input.password, "Password");
  const confirmPassword = requireNonEmpty(
    input.confirmPassword,
    "Password confirmation",
  );

  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters");
  }

  if (password !== confirmPassword) {
    throw new Error("Passwords do not match");
  }

  return { password };
}

export function validateTechnicianAccess(record: TechnicianAuthRecord | null) {
  if (!record) {
    return null;
  }

  if (record.profile.role !== "technician") {
    throw new Error("Technician access is required");
  }

  return record;
}

export function validateAdminProfile(profile: UserProfile | null) {
  if (!profile) {
    return null;
  }

  if (profile.role !== "admin" && profile.role !== "dispatcher") {
    throw new Error("Admin or dispatcher access is required");
  }

  if (profile.status === "inactive") {
    throw new Error("This account has been deactivated");
  }

  return profile;
}

export function validateAdminAccess<TRecord extends { profile: UserProfile }>(
  record: TRecord | null,
) {
  if (!record) {
    return null;
  }

  validateAdminProfile(record.profile);

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
  const record = await signInWithPasswordRecord(
    client,
    normalized.email,
    normalized.password,
  );

  try {
    return validateTechnicianAccess(record);
  } catch (error) {
    await signOutRecord(client);
    throw error;
  }
}

export async function signInAdmin(
  client: AuthSupabaseClient,
  input: LoginInput,
) {
  const normalized = validateAdminLoginInput(input);
  const record = await signInWithPasswordRecord(
    client,
    normalized.email,
    normalized.password,
  );

  try {
    return validateAdminAccess(record);
  } catch (error) {
    await signOutRecord(client);
    throw error;
  }
}

export async function signOutTechnician(client: AuthSupabaseClient) {
  await signOutRecord(client);
}

export async function signOutAdmin(client: AuthSupabaseClient) {
  await signOutRecord(client);
}

export async function requestPasswordReset(
  client: AuthSupabaseClient,
  input: PasswordResetRequestInput,
) {
  const normalized = validatePasswordResetRequestInput(input);

  await resetPasswordForEmailRecord(
    client,
    normalized.email,
    normalized.redirectTo,
  );
}

export async function establishPasswordRecoverySession(
  client: AuthSupabaseClient,
  input: PasswordRecoverySessionInput,
) {
  const normalized = validatePasswordRecoverySessionInput(input);

  await setPasswordRecoverySessionRecord(
    client,
    normalized.accessToken,
    normalized.refreshToken,
  );
}

export async function updateCurrentUserPassword(
  client: AuthSupabaseClient,
  input: PasswordUpdateInput,
) {
  const normalized = validatePasswordUpdateInput(input);

  await updatePasswordRecord(client, normalized.password);
}
