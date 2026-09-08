import { describe, expect, it, vi } from "vitest";

import { createAuthAdapter, createCustomersAdapter } from "./adapters";

/**
 * Adapter-mapping tests, which `docs/architecture.md` requires of CR05.
 *
 * These cover the half of the boundary a use-case test cannot reach: that a
 * port method actually calls the provider the way the adapter intends, with the
 * client bound at construction rather than passed per call. Use-case behaviour
 * is tested in `packages/application` against a stub port.
 */

function createFakeClient() {
  const resetPasswordForEmail = vi.fn().mockResolvedValue({ error: null });
  const setSession = vi.fn().mockResolvedValue({
    data: { session: { access_token: "token" } },
    error: null,
  });
  const updateUser = vi
    .fn()
    .mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
  const signOut = vi.fn().mockResolvedValue({ error: null });

  return {
    calls: { resetPasswordForEmail, setSession, updateUser, signOut },
    client: {
      auth: { resetPasswordForEmail, setSession, updateUser, signOut },
    } as never,
  };
}

describe("auth adapter mapping", () => {
  it("binds its client once, rather than taking one per call", async () => {
    const first = createFakeClient();
    const second = createFakeClient();
    const port = createAuthAdapter(first.client);

    await port.resetPasswordForEmailRecord("admin@example.com", "https://app");
    await port.signOutRecord();

    // Both calls went to the client the factory was given, and nothing reached
    // the other one. This is what "selected at the composition root" means.
    expect(first.calls.resetPasswordForEmail).toHaveBeenCalledTimes(1);
    expect(first.calls.signOut).toHaveBeenCalledTimes(1);
    expect(second.calls.resetPasswordForEmail).not.toHaveBeenCalled();
    expect(second.calls.signOut).not.toHaveBeenCalled();
  });

  it("maps a password reset onto the provider's own call shape", async () => {
    const { calls, client } = createFakeClient();

    await createAuthAdapter(client).resetPasswordForEmailRecord(
      "admin@example.com",
      "https://app.example.com/auth/update-password",
    );

    expect(calls.resetPasswordForEmail).toHaveBeenCalledWith(
      "admin@example.com",
      { redirectTo: "https://app.example.com/auth/update-password" },
    );
  });

  it("maps a recovery session onto the provider's token pair", async () => {
    const { calls, client } = createFakeClient();

    await createAuthAdapter(client).setPasswordRecoverySessionRecord(
      "access",
      "refresh",
    );

    expect(calls.setSession).toHaveBeenCalledWith({
      access_token: "access",
      refresh_token: "refresh",
    });
  });

  it("surfaces a provider error rather than returning a partial result", async () => {
    const { calls, client } = createFakeClient();
    calls.resetPasswordForEmail.mockResolvedValueOnce({
      error: { message: "provider unavailable" },
    });

    await expect(
      createAuthAdapter(client).resetPasswordForEmailRecord("a@b.c", "https://x"),
    ).rejects.toThrow("provider unavailable");
  });

  it("keeps a retry on the same stable identity rather than minting a new one", async () => {
    // Replaying an intent must reach the provider with the arguments the intent
    // already carries; an adapter that rewrote or regenerated them would turn
    // one logical write into two.
    const { calls, client } = createFakeClient();
    const port = createAuthAdapter(client);

    calls.setSession.mockRejectedValueOnce(new Error("network unavailable"));

    await expect(
      port.setPasswordRecoverySessionRecord("access", "refresh"),
    ).rejects.toThrow("network unavailable");
    await port.setPasswordRecoverySessionRecord("access", "refresh");

    expect(calls.setSession).toHaveBeenCalledTimes(2);
    expect(calls.setSession.mock.calls[0]).toEqual(calls.setSession.mock.calls[1]);
  });
});

describe("adapter construction", () => {
  it("exposes exactly the port's methods", () => {
    const port = createCustomersAdapter();

    expect(Object.keys(port).sort()).toEqual([
      "archiveCustomerRecord",
      "createCustomerRecord",
      "listCustomerRecords",
      "updateCustomerRecord",
    ]);
  });

  it("returns a fresh object per call, so roots cannot share mutable state", () => {
    expect(createCustomersAdapter()).not.toBe(createCustomersAdapter());
  });
});
