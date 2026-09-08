import { describe, expect, it } from "vitest";

import {
  validateAdminAccess,
  validateAdminProfile,
  validateLoginInput,
  validatePasswordRecoverySessionInput,
  validatePasswordResetRequestInput,
  validatePasswordUpdateInput,
  validateTechnicianLoginInput,
} from "./auth";

const now = "2026-05-05T00:00:00Z";
const session = {
  access_token: "token",
  refresh_token: "refresh",
  expires_in: 3600,
  token_type: "bearer",
  user: { id: "user-1" },
} as never;

describe("auth domain", () => {
  it("validates shared login input", () => {
    expect(
      validateLoginInput({
        email: " TECH@example.COM ",
        password: " password ",
      }),
    ).toEqual({
      email: "tech@example.com",
      password: "password",
    });
  });

  it("rejects missing login fields", () => {
    expect(() =>
      validateTechnicianLoginInput({ email: "", password: "password" }),
    ).toThrow("Email is required");
    expect(() =>
      validateTechnicianLoginInput({ email: "tech@example.com", password: "" }),
    ).toThrow("Password is required");
  });

  it("validates password reset requests", () => {
    expect(
      validatePasswordResetRequestInput({
        email: " ADMIN@example.COM ",
        redirectTo: "https://app.example.com/auth/update-password",
      }),
    ).toEqual({
      email: "admin@example.com",
      redirectTo: "https://app.example.com/auth/update-password",
    });

    expect(() =>
      validatePasswordResetRequestInput({
        email: "",
        redirectTo: "https://app.example.com/auth/update-password",
      }),
    ).toThrow("Email is required");
  });

  it("rejects missing password reset redirects", () => {
    expect(() =>
      validatePasswordResetRequestInput({
        email: "admin@example.com",
        redirectTo: " ",
      }),
    ).toThrow("Password reset redirect is required");
  });

  it("validates password recovery session tokens", () => {
    expect(
      validatePasswordRecoverySessionInput({
        accessToken: " token ",
        refreshToken: " refresh ",
      }),
    ).toEqual({
      accessToken: "token",
      refreshToken: "refresh",
    });

    expect(() =>
      validatePasswordRecoverySessionInput({
        accessToken: "",
        refreshToken: "refresh",
      }),
    ).toThrow("Recovery access token is required");
  });

  it("validates new passwords before update", () => {
    expect(
      validatePasswordUpdateInput({
        password: "new-password",
        confirmPassword: "new-password",
      }),
    ).toEqual({ password: "new-password" });

    expect(() =>
      validatePasswordUpdateInput({
        password: "",
        confirmPassword: "",
      }),
    ).toThrow("Password is required");
    expect(() =>
      validatePasswordUpdateInput({
        password: "short",
        confirmPassword: "short",
      }),
    ).toThrow("Password must be at least 8 characters");
    expect(() =>
      validatePasswordUpdateInput({
        password: "new-password",
        confirmPassword: "different-password",
      }),
    ).toThrow("Passwords do not match");
  });

  it("accepts admin and dispatcher profiles for admin web access", () => {
    expect(
      validateAdminProfile({
        id: "user-0",
        role: "admin",
        created_at: now,
        updated_at: now,
      }),
    ).toMatchObject({
      id: "user-0",
      role: "admin",
    });

    expect(
      validateAdminProfile({
        id: "user-dispatch",
        role: "dispatcher",
        created_at: now,
        updated_at: now,
      }),
    ).toMatchObject({
      id: "user-dispatch",
      role: "dispatcher",
    });

    expect(
      validateAdminAccess({
        session,
        profile: {
          id: "user-1",
          role: "admin",
          created_at: now,
          updated_at: now,
        },
      }),
    ).toBeTruthy();

    expect(
      validateAdminAccess({
        session,
        profile: {
          id: "user-2",
          role: "dispatcher",
          created_at: now,
          updated_at: now,
        },
      }),
    ).toBeTruthy();
  });

  it("rejects technician profiles for admin web access", () => {
    expect(() =>
      validateAdminProfile({
        id: "user-0",
        role: "technician",
        created_at: now,
        updated_at: now,
      }),
    ).toThrow("Admin or dispatcher access is required");

    expect(() =>
      validateAdminAccess({
        session,
        profile: {
          id: "user-1",
          role: "technician",
          created_at: now,
          updated_at: now,
        },
      }),
    ).toThrow("Admin or dispatcher access is required");
  });

  it("rejects deactivated admin and dispatcher profiles", () => {
    expect(() =>
      validateAdminProfile({
        id: "user-0",
        role: "admin",
        status: "inactive",
        created_at: now,
        updated_at: now,
      }),
    ).toThrow("This account has been deactivated");

    expect(() =>
      validateAdminAccess({
        session,
        profile: {
          id: "user-1",
          role: "dispatcher",
          status: "inactive",
          created_at: now,
          updated_at: now,
        },
      }),
    ).toThrow("This account has been deactivated");
  });
});
