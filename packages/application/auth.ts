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
import {
  LoginInput,
  PasswordRecoverySessionInput,
  PasswordResetRequestInput,
  PasswordUpdateInput,
  TechnicianLoginInput,
  validateAdminAccess,
  validateAdminLoginInput,
  validatePasswordRecoverySessionInput,
  validatePasswordResetRequestInput,
  validatePasswordUpdateInput,
  validateTechnicianLoginInput,
} from "@pest-patrol/domain";

export function validateTechnicianAccess(record: TechnicianAuthRecord | null) {
  if (!record) {
    return null;
  }

  if (record.profile.role !== "technician") {
    throw new Error("Technician access is required");
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
