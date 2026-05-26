import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

async function renderAuthProbe(
  profileEmail: string,
  options: {
    currentAuth?: boolean;
    refreshError?: Error;
    seedStatus?: {
      available: boolean;
      environment_label: string;
      reason: string | null;
      target: "local" | "preview";
    };
  } = {},
) {
  vi.resetModules();

  const refreshDemoLoginSeedRecord = options.refreshError
    ? vi.fn().mockRejectedValue(options.refreshError)
    : vi.fn().mockResolvedValue({});
  const isDemoLoginRefreshUnavailableError = vi.fn(
    (error: unknown) => error === options.refreshError,
  );
  const authRecord = {
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
  };
  const signInAdmin = vi.fn().mockResolvedValue(authRecord);
  const getCurrentAdminAuth = vi
    .fn()
    .mockResolvedValue(options.currentAuth ? authRecord : null);
  const getDemoSeedStatusRecord = vi.fn().mockResolvedValue({
    status: options.seedStatus ?? {
      available: true,
      environment_label: "Protected preview demo",
      reason: null,
      target: "preview",
    },
    summary: {},
  });
  const activateLocalDemoFixtureSession = vi.fn();
  const deactivateLocalDemoFixtureSession = vi.fn();

  vi.doMock("@pest-patrol/api-client", () => ({
    getDemoSeedStatusRecord,
    isDemoLoginRefreshUnavailableError,
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
    getCurrentAdminAuth,
    requestPasswordReset: vi.fn(),
    shouldUseLocalDemoFixtures: vi.fn().mockReturnValue(false),
    signInAdmin,
    signOutAdmin: vi.fn(),
    updateCurrentUserPassword: vi.fn(),
  }));
  vi.doMock("../hooks/localDemoData", () => ({
    activateLocalDemoFixtureSession,
    deactivateLocalDemoFixtureSession,
    getLocalDemoFixtures: vi.fn(),
    isLocalDemoFixtureMode: vi.fn().mockReturnValue(false),
    resetLocalDemoFixtures: vi.fn().mockReturnValue({
      adminProfile: authRecord.profile,
    }),
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

  if (!options.currentAuth) {
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
  }

  return {
    activateLocalDemoFixtureSession,
    deactivateLocalDemoFixtureSession,
    getCurrentAdminAuth,
    getDemoSeedStatusRecord,
    isDemoLoginRefreshUnavailableError,
    refreshDemoLoginSeedRecord,
    signInAdmin,
  };
}

describe("AdminAuthProvider demo login refresh", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.doUnmock("@pest-patrol/api-client");
    vi.doUnmock("@pest-patrol/domain");
    vi.doUnmock("../hooks/localDemoData");
  });

  it("refreshes demo-owned records after demo@email.com signs in", async () => {
    const { refreshDemoLoginSeedRecord, signInAdmin } =
      await renderAuthProbe("demo@email.com");

    await waitFor(() => expect(signInAdmin).toHaveBeenCalled());

    expect(refreshDemoLoginSeedRecord).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByText("signed_in")).toBeTruthy());
  });

  it("allows demo sign-in when production refuses the refresh side effect", async () => {
    const refreshError = new Error(
      "Demo seed is disabled on production deployments.",
    );
    const {
      activateLocalDemoFixtureSession,
      isDemoLoginRefreshUnavailableError,
      refreshDemoLoginSeedRecord,
      signInAdmin,
    } = await renderAuthProbe("demo@email.com", { refreshError });

    await waitFor(() => expect(signInAdmin).toHaveBeenCalled());

    expect(refreshDemoLoginSeedRecord).toHaveBeenCalledTimes(1);
    expect(isDemoLoginRefreshUnavailableError).toHaveBeenCalledWith(
      refreshError,
    );
    expect(activateLocalDemoFixtureSession).toHaveBeenCalledWith({
      reset: true,
    });
    await waitFor(() => expect(screen.getByText("signed_in")).toBeTruthy());
  });

  it("activates fixture-backed reads for an existing production demo session", async () => {
    const { activateLocalDemoFixtureSession, getDemoSeedStatusRecord } =
      await renderAuthProbe("demo@email.com", {
        currentAuth: true,
        seedStatus: {
          available: false,
          environment_label: "Production",
          reason: "Demo seed is disabled on production deployments.",
          target: "local",
        },
      });

    await waitFor(() => expect(getDemoSeedStatusRecord).toHaveBeenCalled());

    expect(activateLocalDemoFixtureSession).toHaveBeenCalledWith({
      reset: false,
    });
    await waitFor(() => expect(screen.getByText("signed_in")).toBeTruthy());
  });

  it("does not refresh demo data for other admins", async () => {
    const { refreshDemoLoginSeedRecord, signInAdmin } =
      await renderAuthProbe("admin@example.com");

    await waitFor(() => expect(signInAdmin).toHaveBeenCalled());

    expect(refreshDemoLoginSeedRecord).not.toHaveBeenCalled();
  });
});
