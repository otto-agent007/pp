import { describe, expect, it, vi } from "vitest";

import {
  establishPasswordRecoverySession,
  requestPasswordReset,
  signInAdmin,
  signInTechnician,
  updateCurrentUserPassword,
  validateAdminAccess,
  validateAdminProfile,
  validateLoginInput,
  validatePasswordRecoverySessionInput,
  validatePasswordResetRequestInput,
  validatePasswordUpdateInput,
  validateTechnicianAccess,
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

  it("returns null for missing role records", () => {
    expect(validateAdminProfile(null)).toBeNull();
    expect(validateAdminAccess(null)).toBeNull();
    expect(validateTechnicianAccess(null)).toBeNull();
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

  it("accepts technician profiles only", () => {
    expect(
      validateTechnicianAccess({
        session,
        profile: {
          id: "user-1",
          role: "technician",
          created_at: now,
          updated_at: now,
        },
      }),
    ).toBeTruthy();

    expect(() =>
      validateTechnicianAccess({
        session,
        profile: {
          id: "user-1",
          role: "admin",
          created_at: now,
          updated_at: now,
        },
      }),
    ).toThrow("Technician access is required");
  });

  it("requests password reset through the api client", async () => {
    const resetPasswordForEmail = vi.fn().mockResolvedValue({ error: null });
    const client = {
      auth: { resetPasswordForEmail },
    } as never;

    await requestPasswordReset(client, {
      email: " ADMIN@example.COM ",
      redirectTo: "https://app.example.com/auth/update-password",
    });

    expect(resetPasswordForEmail).toHaveBeenCalledWith("admin@example.com", {
      redirectTo: "https://app.example.com/auth/update-password",
    });
  });

  it("establishes password recovery sessions through the api client", async () => {
    const setSession = vi.fn().mockResolvedValue({
      data: { session },
      error: null,
    });
    const client = {
      auth: { setSession },
    } as never;

    await establishPasswordRecoverySession(client, {
      accessToken: " token ",
      refreshToken: " refresh ",
    });

    expect(setSession).toHaveBeenCalledWith({
      access_token: "token",
      refresh_token: "refresh",
    });
  });

  it("updates the current user password through the api client", async () => {
    const updateUser = vi.fn().mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    const client = {
      auth: { updateUser },
    } as never;

    await updateCurrentUserPassword(client, {
      password: "new-password",
      confirmPassword: "new-password",
    });

    expect(updateUser).toHaveBeenCalledWith({ password: "new-password" });
  });

  it("signs out a wrong-role admin session before surfacing the access error", async () => {
    const signInWithPassword = vi.fn().mockResolvedValue({
      data: { session },
      error: null,
    });
    const signOut = vi.fn().mockResolvedValue({ error: null });
    const single = vi.fn().mockResolvedValue({
      data: {
        id: "user-1",
        role: "technician",
        created_at: now,
        updated_at: now,
      },
      error: null,
    });
    const client = {
      auth: { signInWithPassword, signOut },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single,
      }),
    } as never;

    await expect(
      signInAdmin(client, { email: "tech@example.com", password: "password" }),
    ).rejects.toThrow("Admin or dispatcher access is required");

    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it("signs out a wrong-role technician session before surfacing the access error", async () => {
    const signInWithPassword = vi.fn().mockResolvedValue({
      data: { session },
      error: null,
    });
    const signOut = vi.fn().mockResolvedValue({ error: null });
    const single = vi.fn().mockResolvedValue({
      data: {
        id: "user-1",
        role: "admin",
        created_at: now,
        updated_at: now,
      },
      error: null,
    });
    const client = {
      auth: { signInWithPassword, signOut },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single,
      }),
    } as never;

    await expect(
      signInTechnician(client, { email: "admin@example.com", password: "password" }),
    ).rejects.toThrow("Technician access is required");

    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it("does not sign out when role validation succeeds", async () => {
    const signInWithPassword = vi.fn().mockResolvedValue({
      data: { session },
      error: null,
    });
    const signOut = vi.fn().mockResolvedValue({ error: null });
    const single = vi.fn().mockResolvedValue({
      data: {
        id: "user-1",
        role: "admin",
        created_at: now,
        updated_at: now,
      },
      error: null,
    });
    const client = {
      auth: { signInWithPassword, signOut },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single,
      }),
    } as never;

    const record = await signInAdmin(client, {
      email: "admin@example.com",
      password: "password",
    });

    expect(record).toMatchObject({ profile: { role: "admin" } });
    expect(signOut).not.toHaveBeenCalled();
  });
});
