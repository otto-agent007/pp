import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  establishPasswordRecoverySession,
  requestPasswordReset,
  signInAdmin,
  signInTechnician,
  updateCurrentUserPassword,
  validateTechnicianAccess,
} from "./auth";
import type { AuthPort } from "./ports";
import { validateAdminAccess, validateAdminProfile } from "@pest-patrol/domain";

const now = "2026-05-05T00:00:00Z";
const session = {
  access_token: "token",
  refresh_token: "refresh",
  expires_in: 3600,
  token_type: "bearer",
  user: { id: "user-1" },
} as never;

/**
 * A stub port, in place of a fake Supabase client.
 *
 * These tests previously reached through the adapter into `client.auth.*`,
 * which meant a use-case test could only run by knowing how the provider is
 * called. With a port between them the use case is testable on its own, and
 * whether the adapter maps correctly onto Supabase belongs to
 * `packages/api-client`'s own tests.
 */
function createStubPort(role = "admin") {
  return {
    getCurrentAuthRecord: vi.fn(),
    resetPasswordForEmailRecord: vi.fn().mockResolvedValue(undefined),
    setPasswordRecoverySessionRecord: vi.fn().mockResolvedValue(session),
    signInWithPasswordRecord: vi.fn().mockResolvedValue({
      session,
      profile: { id: "user-1", role, created_at: now, updated_at: now },
    }),
    signOutRecord: vi.fn().mockResolvedValue(undefined),
    updatePasswordRecord: vi.fn().mockResolvedValue({ id: "user-1" }),
  };
}

// The stub is structurally a port; this fails to compile if it drifts.
const _shapeCheck: (p: ReturnType<typeof createStubPort>) => AuthPort<never> = (
  p,
) => p;
void _shapeCheck;

let port: ReturnType<typeof createStubPort>;

beforeEach(() => {
  port = createStubPort();
});

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

  it("requests a password reset through its port", async () => {
    await requestPasswordReset(port, {
      email: " ADMIN@example.COM ",
      redirectTo: "https://app.example.com/auth/update-password",
    });

    expect(port.resetPasswordForEmailRecord).toHaveBeenCalledWith(
      "admin@example.com",
      "https://app.example.com/auth/update-password",
    );
  });

  it("establishes a password recovery session through its port", async () => {
    await establishPasswordRecoverySession(port, {
      accessToken: " token ",
      refreshToken: " refresh ",
    });

    expect(port.setPasswordRecoverySessionRecord).toHaveBeenCalledWith(
      "token",
      "refresh",
    );
  });

  it("updates the current user password through its port", async () => {
    await updateCurrentUserPassword(port, {
      password: "new-password",
      confirmPassword: "new-password",
    });

    expect(port.updatePasswordRecord).toHaveBeenCalledWith("new-password");
  });

  it("signs out a wrong-role admin session before surfacing the access error", async () => {
    port = createStubPort("technician");

    await expect(
      signInAdmin(port, { email: "tech@example.com", password: "password" }),
    ).rejects.toThrow("Admin or dispatcher access is required");

    expect(port.signOutRecord).toHaveBeenCalledTimes(1);
  });

  it("signs out a wrong-role technician session before surfacing the access error", async () => {
    port = createStubPort("admin");

    await expect(
      signInTechnician(port, {
        email: "admin@example.com",
        password: "password",
      }),
    ).rejects.toThrow("Technician access is required");

    expect(port.signOutRecord).toHaveBeenCalledTimes(1);
  });

  it("does not sign out when role validation succeeds", async () => {
    port = createStubPort("technician");

    const record = await signInTechnician(port, {
      email: "tech@example.com",
      password: "password",
    });

    expect(record?.profile.role).toBe("technician");
    expect(port.signOutRecord).not.toHaveBeenCalled();
  });
});
