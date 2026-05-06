import { describe, expect, it } from "vitest";

import {
  validateAdminAccess,
  validateLoginInput,
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

  it("accepts admin and dispatcher profiles for admin web access", () => {
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
});
