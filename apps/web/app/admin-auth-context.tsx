"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  isDemoLoginRefreshUnavailableError,
  refreshDemoLoginSeedRecord,
  supabase,
} from "@pest-patrol/api-client";
import type { UserProfile } from "@pest-patrol/types";
import {
  DEMO_SEED_ADMIN_EMAIL,
  establishPasswordRecoverySession,
  getCurrentAdminAuth,
  requestPasswordReset as requestPasswordResetDomain,
  shouldUseLocalDemoFixtures,
  signInAdmin,
  signOutAdmin,
  updateCurrentUserPassword,
} from "@pest-patrol/domain";
import {
  getLocalDemoFixtures,
  resetLocalDemoFixtures,
} from "../hooks/localDemoData";

type AdminAuthStatus = "loading" | "signed_in" | "signed_out";

interface AdminAuthState {
  error: string | null;
  profile: UserProfile | null;
  session: Session | null;
  status: AdminAuthStatus;
}

interface AdminAuthSnapshot extends AdminAuthState {
  establishPasswordRecoverySession: (
    accessToken: string,
    refreshToken: string,
  ) => Promise<void>;
  initialize: () => Promise<void>;
  requestPasswordReset: (email: string, redirectTo: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInLocalDemo: () => Promise<void>;
  signOut: () => Promise<void>;
  updatePassword: (password: string, confirmPassword: string) => Promise<void>;
}

const signedOutState: AdminAuthState = {
  error: null,
  profile: null,
  session: null,
  status: "signed_out",
};

let authState: AdminAuthState = {
  ...signedOutState,
  status: "loading",
};
let authSnapshot: AdminAuthSnapshot = {
  ...authState,
  establishPasswordRecoverySession: startPasswordRecoverySession,
  initialize: initializeAdminAuth,
  requestPasswordReset,
  signIn,
  signInLocalDemo,
  signOut,
  updatePassword,
};
let subscriptionStarted = false;
const listeners = new Set<() => void>();
const localDemoSessionKey = "pest-patrol-local-demo-session";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unable to authenticate";
}

function setAuthState(nextState: AdminAuthState) {
  authState = nextState;
  authSnapshot = {
    ...authState,
    establishPasswordRecoverySession: startPasswordRecoverySession,
    initialize: initializeAdminAuth,
    requestPasswordReset,
    signIn,
    signInLocalDemo,
    signOut,
    updatePassword,
  };
  listeners.forEach((listener) => listener());
}

function patchAuthState(update: Partial<AdminAuthState>) {
  setAuthState({ ...authState, ...update });
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

function localDemoFixtureModeEnabled() {
  return shouldUseLocalDemoFixtures({
    nodeEnv: process.env.NODE_ENV,
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  });
}

function readLocalDemoSession() {
  return (
    typeof window !== "undefined" &&
    window.localStorage.getItem(localDemoSessionKey) === "active"
  );
}

function writeLocalDemoSession(active: boolean) {
  if (typeof window === "undefined") {
    return;
  }

  if (active) {
    window.localStorage.setItem(localDemoSessionKey, "active");
    return;
  }

  window.localStorage.removeItem(localDemoSessionKey);
}

function buildLocalDemoAuthState(): AdminAuthState {
  const profile =
    getLocalDemoFixtures()?.adminProfile ??
    resetLocalDemoFixtures().adminProfile;
  const nowSeconds = Math.floor(Date.now() / 1000);

  return {
    error: null,
    profile,
    session: {
      access_token: "local-demo-access-token",
      refresh_token: "local-demo-refresh-token",
      expires_in: 60 * 60,
      expires_at: nowSeconds + 60 * 60,
      token_type: "bearer",
      user: {
        id: profile.id,
        aud: "authenticated",
        app_metadata: {},
        user_metadata: {
          display_name: profile.display_name,
          role: profile.role,
        },
        created_at: profile.created_at,
        email: profile.email ?? undefined,
      },
    } as Session,
    status: "signed_in",
  };
}

export async function initializeAdminAuth() {
  patchAuthState({
    error: null,
    status: authState.status === "signed_in" ? "signed_in" : "loading",
  });

  try {
    if (localDemoFixtureModeEnabled() && readLocalDemoSession()) {
      setAuthState(buildLocalDemoAuthState());
      return;
    }

    const record = await getCurrentAdminAuth(supabase);

    if (!record) {
      setAuthState(signedOutState);
      return;
    }

    setAuthState({
      error: null,
      profile: record.profile,
      session: record.session,
      status: "signed_in",
    });
  } catch (error) {
    setAuthState({
      ...signedOutState,
      error: errorMessage(error),
    });
  }
}

async function signIn(email: string, password: string) {
  patchAuthState({
    error: null,
    status: "loading",
  });

  try {
    const record = await signInAdmin(supabase, { email, password });

    if (!record) {
      throw new Error("Unable to start admin session");
    }

    if (record.profile.email === DEMO_SEED_ADMIN_EMAIL) {
      try {
        await refreshDemoLoginSeedRecord(supabase);
      } catch (error) {
        if (!isDemoLoginRefreshUnavailableError(error)) {
          throw error;
        }
      }
    }

    setAuthState({
      error: null,
      profile: record.profile,
      session: record.session,
      status: "signed_in",
    });
  } catch (error) {
    setAuthState({
      ...signedOutState,
      error: errorMessage(error),
    });
  }
}

async function signInLocalDemo() {
  if (!localDemoFixtureModeEnabled()) {
    throw new Error("Local fixture demo is not available in this environment.");
  }

  writeLocalDemoSession(true);
  resetLocalDemoFixtures();
  setAuthState(buildLocalDemoAuthState());
}

async function signOut() {
  try {
    await signOutAdmin(supabase);
  } finally {
    writeLocalDemoSession(false);
    setAuthState(signedOutState);
  }
}

async function requestPasswordReset(email: string, redirectTo: string) {
  await requestPasswordResetDomain(supabase, { email, redirectTo });
}

async function startPasswordRecoverySession(
  accessToken: string,
  refreshToken: string,
) {
  await establishPasswordRecoverySession(supabase, {
    accessToken,
    refreshToken,
  });
}

async function updatePassword(password: string, confirmPassword: string) {
  try {
    await updateCurrentUserPassword(supabase, { password, confirmPassword });
    await initializeAdminAuth();
  } catch (error) {
    patchAuthState({ error: errorMessage(error) });
    throw error;
  }
}

function ensureAuthSubscription() {
  if (subscriptionStarted) {
    return;
  }

  subscriptionStarted = true;
  supabase.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT") {
      setAuthState(signedOutState);
      return;
    }

    if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
      void initializeAdminAuth();
    }
  });
}

function getSnapshot(): AdminAuthSnapshot {
  return authSnapshot;
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    ensureAuthSubscription();
    void initializeAdminAuth();
  }, []);

  return <>{children}</>;
}

export function useAdminAuth() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
