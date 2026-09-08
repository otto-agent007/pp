import type { AuthPort, AuthRecord } from "./ports";
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

export function validateTechnicianAccess<TSession>(
  record: AuthRecord<TSession> | null,
) {
  if (!record) {
    return null;
  }

  if (record.profile.role !== "technician") {
    throw new Error("Technician access is required");
  }

  return record;
}

export async function getCurrentTechnicianAuth<TSession>(
  port: AuthPort<TSession>,
) {
  return validateTechnicianAccess(await port.getCurrentAuthRecord());
}

export async function getCurrentAdminAuth<TSession>(port: AuthPort<TSession>) {
  return validateAdminAccess(await port.getCurrentAuthRecord());
}

export async function signInTechnician<TSession>(
  port: AuthPort<TSession>,
  input: TechnicianLoginInput,
) {
  const normalized = validateTechnicianLoginInput(input);
  const record = await port.signInWithPasswordRecord(
    normalized.email,
    normalized.password,
  );

  try {
    return validateTechnicianAccess(record);
  } catch (error) {
    await port.signOutRecord();
    throw error;
  }
}

export async function signInAdmin<TSession>(
  port: AuthPort<TSession>,
  input: LoginInput,
) {
  const normalized = validateAdminLoginInput(input);
  const record = await port.signInWithPasswordRecord(
    normalized.email,
    normalized.password,
  );

  try {
    return validateAdminAccess(record);
  } catch (error) {
    await port.signOutRecord();
    throw error;
  }
}

export async function signOutTechnician<TSession>(port: AuthPort<TSession>) {
  await port.signOutRecord();
}

export async function signOutAdmin<TSession>(port: AuthPort<TSession>) {
  await port.signOutRecord();
}

export async function requestPasswordReset<TSession>(
  port: AuthPort<TSession>,
  input: PasswordResetRequestInput,
) {
  const normalized = validatePasswordResetRequestInput(input);

  await port.resetPasswordForEmailRecord(
    normalized.email,
    normalized.redirectTo,
  );
}

export async function establishPasswordRecoverySession<TSession>(
  port: AuthPort<TSession>,
  input: PasswordRecoverySessionInput,
) {
  const normalized = validatePasswordRecoverySessionInput(input);

  await port.setPasswordRecoverySessionRecord(
    normalized.accessToken,
    normalized.refreshToken,
  );
}

export async function updateCurrentUserPassword<TSession>(
  port: AuthPort<TSession>,
  input: PasswordUpdateInput,
) {
  const normalized = validatePasswordUpdateInput(input);

  await port.updatePasswordRecord(normalized.password);
}
