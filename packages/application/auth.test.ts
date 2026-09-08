import { describe, expect, it, vi } from "vitest";

import {
  establishPasswordRecoverySession,
  requestPasswordReset,
  signInAdmin,
  signInTechnician,
  updateCurrentUserPassword,
  validateTechnicianAccess,
} from "./auth";
import { validateAdminAccess, validateAdminProfile } from "@pest-patrol/domain";

const now = "2026-05-05T00:00:00Z";
const session = {
  access_token: "token",
  refresh_token: "refresh",
  expires_in: 3600,
  token_type: "bearer",
  user: { id: "user-1" },
} as never;

describe("auth use cases", () => {
  it("returns null for missing role records", () => {
    expect(validateAdminProfile(null)).toBeNull();
    expect(validateAdminAccess(null)).toBeNull();
    expect(validateTechnicianAccess(null)).toBeNull();
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
