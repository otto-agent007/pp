import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

async function renderAuthProbe(profileEmail: string) {
  vi.resetModules();

  const refreshDemoLoginSeedRecord = vi.fn().mockResolvedValue({});
  const signInAdmin = vi.fn().mockResolvedValue({
    profile: {
      id: "demo-admin-user",
      role: "admin",
      email: profileEmail,
      display_name: "Demo - Admin",
      status: "active",
      created_at: "2026-05-14T16:00:00.000Z",
      updated_at: "2026-05-14T16:00:00.000Z",
    },
    session: {
      access_token: "demo-token",
      refresh_token: "demo-refresh",
      user: { id: "demo-admin-user", email: profileEmail },
    },
  });

  vi.doMock("@pest-patrol/api-client", () => ({
    refreshDemoLoginSeedRecord,
    supabase: {
      auth: {
        onAuthStateChange: vi.fn(),
      },
    },
  }));
  vi.doMock("@pest-patrol/domain", () => ({
    DEMO_SEED_ADMIN_EMAIL: "demo@email.com",
    buildDemoWorkflowFixtures: vi.fn(),
    establishPasswordRecoverySession: vi.fn(),
    getCurrentAdminAuth: vi.fn().mockResolvedValue(null),
    requestPasswordReset: vi.fn(),
    shouldUseLocalDemoFixtures: vi.fn().mockReturnValue(false),
    signInAdmin,
    signOutAdmin: vi.fn(),
    updateCurrentUserPassword: vi.fn(),
  }));

  const { AdminAuthProvider, useAdminAuth } =
    await import("./admin-auth-context");

  function Probe() {
    const auth = useAdminAuth();

    return (
      <div>
        <p>{auth.status}</p>
        <button
          onClick={() => {
            void auth.signIn(profileEmail, "password");
          }}
          type="button"
        >
          Sign in
        </button>
      </div>
    );
  }

  render(
    <AdminAuthProvider>
      <Probe />
    </AdminAuthProvider>,
  );

  await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

  return { refreshDemoLoginSeedRecord, signInAdmin };
}

describe("AdminAuthProvider demo login refresh", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.doUnmock("@pest-patrol/api-client");
    vi.doUnmock("@pest-patrol/domain");
  });

  it("refreshes demo-owned records after demo@email.com signs in", async () => {
    const { refreshDemoLoginSeedRecord, signInAdmin } =
      await renderAuthProbe("demo@email.com");

    await waitFor(() => expect(signInAdmin).toHaveBeenCalled());

    expect(refreshDemoLoginSeedRecord).toHaveBeenCalledTimes(1);
  });

  it("does not refresh demo data for other admins", async () => {
    const { refreshDemoLoginSeedRecord, signInAdmin } =
      await renderAuthProbe("admin@example.com");

    await waitFor(() => expect(signInAdmin).toHaveBeenCalled());

    expect(refreshDemoLoginSeedRecord).not.toHaveBeenCalled();
  });
});
