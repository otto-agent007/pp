import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
    signOutError?: Error;
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
  const signOutAdmin = options.signOutError
    ? vi.fn().mockRejectedValue(options.signOutError)
    : vi.fn().mockResolvedValue(undefined);
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
    shouldUseLocalDemoFixtures: vi.fn().mockReturnValue(false),
  }));
  vi.doMock("@pest-patrol/application", () => ({
    establishPasswordRecoverySession: vi.fn(),
    getCurrentAdminAuth,
    requestPasswordReset: vi.fn(),
    signInAdmin,
    signOutAdmin,
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
        <p>{auth.error ?? ""}</p>
        <button
          onClick={() => {
            void auth.signIn(profileEmail, "password");
          }}
          type="button"
        >
          Sign in
        </button>
        <button
          onClick={() => {
            void auth.signOut();
          }}
          type="button"
        >
          Sign out
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
    signOutAdmin,
  };
}

describe("AdminAuthProvider demo login refresh", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.doUnmock("@pest-patrol/api-client");
    vi.doUnmock("@pest-patrol/domain");
    vi.doUnmock("@pest-patrol/application");
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

describe("AdminAuthProvider sign-out", () => {
  beforeEach(() => {
    // jsdom's localStorage is unavailable in this test environment; stub a
    // minimal in-memory implementation so signOut's local-demo bookkeeping
    // (unrelated to the behavior under test) doesn't throw.
    const store = new Map<string, string>();

    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      removeItem: (key: string) => store.delete(key),
      setItem: (key: string, value: string) => store.set(key, value),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    vi.doUnmock("@pest-patrol/api-client");
    vi.doUnmock("@pest-patrol/domain");
    vi.doUnmock("@pest-patrol/application");
    vi.doUnmock("../hooks/localDemoData");
  });

  it("clears the session and shows no error when the server revoke succeeds", async () => {
    const { signOutAdmin } = await renderAuthProbe("admin@example.com", {
      currentAuth: true,
    });

    await waitFor(() => expect(screen.getByText("signed_in")).toBeTruthy());
    await userEvent.click(screen.getByRole("button", { name: "Sign out" }));

    await waitFor(() => expect(signOutAdmin).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByText("signed_out")).toBeTruthy());
    expect(
      screen.queryByText(/sign out was not confirmed/i),
    ).not.toBeInTheDocument();
  });

  it("clears local state but surfaces a warning when the server revoke fails", async () => {
    const signOutError = new Error("network error");
    const { signOutAdmin } = await renderAuthProbe("admin@example.com", {
      currentAuth: true,
      signOutError,
    });

    await waitFor(() => expect(screen.getByText("signed_in")).toBeTruthy());
    await userEvent.click(screen.getByRole("button", { name: "Sign out" }));

    await waitFor(() => expect(signOutAdmin).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByText("signed_out")).toBeTruthy());
    await waitFor(() =>
      expect(screen.getByText(/sign out was not confirmed/i)).toBeTruthy(),
    );
  });
});
