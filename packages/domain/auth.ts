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
