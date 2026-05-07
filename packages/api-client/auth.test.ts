import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getCurrentAuthRecord,
  getProfileRecord,
  resetPasswordForEmailRecord,
  setPasswordRecoverySessionRecord,
  signInWithPasswordRecord,
  signOutRecord,
  updatePasswordRecord,
} from "./auth";

class MockQuery<T> {
  calls: Array<[string, unknown[]]> = [];

  constructor(private result: T) {}

  select(...args: unknown[]) {
    this.calls.push(["select", args]);
    return this;
  }

  eq(...args: unknown[]) {
    this.calls.push(["eq", args]);
    return this;
  }

  single() {
    this.calls.push(["single", []]);
    return Promise.resolve(this.result);
  }
}

const now = "2026-05-05T00:00:00Z";
const profile = {
  id: "user-1",
  role: "technician",
  created_at: now,
  updated_at: now,
};
const session = {
  access_token: "token",
  refresh_token: "refresh",
  expires_in: 3600,
  token_type: "bearer",
  user: { id: "user-1" },
};

describe("auth api client", () => {
  const from = vi.fn();
  const signInWithPassword = vi.fn();
  const resetPasswordForEmail = vi.fn();
  const setSession = vi.fn();
  const updateUser = vi.fn();
  const getSession = vi.fn();
  const signOut = vi.fn();
  const client = {
    auth: {
      getSession,
      resetPasswordForEmail,
      setSession,
      signInWithPassword,
      signOut,
      updateUser,
    },
    from,
  } as never;

  beforeEach(() => {
    from.mockReset();
    signInWithPassword.mockReset();
    resetPasswordForEmail.mockReset();
    setSession.mockReset();
    updateUser.mockReset();
    getSession.mockReset();
    signOut.mockReset();
  });

  it("fetches a user profile", async () => {
    const profileQuery = new MockQuery({ data: profile, error: null });
    from.mockReturnValue(profileQuery);

    const result = await getProfileRecord(client, "user-1");

    expect(result.role).toBe("technician");
    expect(from).toHaveBeenCalledWith("profiles");
    expect(profileQuery.calls).toContainEqual(["eq", ["id", "user-1"]]);
  });

  it("returns current session and profile", async () => {
    getSession.mockResolvedValue({ data: { session }, error: null });
    from.mockReturnValue(new MockQuery({ data: profile, error: null }));

    const result = await getCurrentAuthRecord(client);

    expect(result?.profile.role).toBe("technician");
  });

  it("signs in with password and fetches profile", async () => {
    signInWithPassword.mockResolvedValue({ data: { session }, error: null });
    from.mockReturnValue(new MockQuery({ data: profile, error: null }));

    const result = await signInWithPasswordRecord(
      client,
      "tech@example.com",
      "password",
    );

    expect(result.profile.role).toBe("technician");
    expect(signInWithPassword).toHaveBeenCalledWith({
      email: "tech@example.com",
      password: "password",
    });
  });

  it("signs out", async () => {
    signOut.mockResolvedValue({ error: null });

    await signOutRecord(client);

    expect(signOut).toHaveBeenCalled();
  });

  it("sends password reset email with the supplied recovery redirect", async () => {
    resetPasswordForEmail.mockResolvedValue({ data: {}, error: null });

    await resetPasswordForEmailRecord(
      client,
      "admin@example.com",
      "https://app.example.com/auth/update-password",
    );

    expect(resetPasswordForEmail).toHaveBeenCalledWith("admin@example.com", {
      redirectTo: "https://app.example.com/auth/update-password",
    });
  });

  it("sets the recovery session from reset link tokens", async () => {
    setSession.mockResolvedValue({
      data: { session },
      error: null,
    });

    await setPasswordRecoverySessionRecord(client, "token", "refresh");

    expect(setSession).toHaveBeenCalledWith({
      access_token: "token",
      refresh_token: "refresh",
    });
  });

  it("updates the current authenticated user's password", async () => {
    updateUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });

    await updatePasswordRecord(client, "new-password");

    expect(updateUser).toHaveBeenCalledWith({ password: "new-password" });
  });
});
