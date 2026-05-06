"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@pest-patrol/api-client";
import type { UserProfile } from "@pest-patrol/types";
import {
  getCurrentAdminAuth,
  signInAdmin,
  signOutAdmin,
} from "@pest-patrol/domain";

type AdminAuthStatus = "loading" | "signed_in" | "signed_out";

interface AdminAuthState {
  error: string | null;
  profile: UserProfile | null;
  session: Session | null;
  status: AdminAuthStatus;
}

interface AdminAuthSnapshot extends AdminAuthState {
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
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
  initialize: initializeAdminAuth,
  signIn,
  signOut,
};
let subscriptionStarted = false;
const listeners = new Set<() => void>();

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unable to authenticate";
}

function setAuthState(nextState: AdminAuthState) {
  authState = nextState;
  authSnapshot = {
    ...authState,
    initialize: initializeAdminAuth,
    signIn,
    signOut,
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

export async function initializeAdminAuth() {
  patchAuthState({
    error: null,
    status: authState.status === "signed_in" ? "signed_in" : "loading",
  });

  try {
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

async function signOut() {
  try {
    await signOutAdmin(supabase);
  } finally {
    setAuthState(signedOutState);
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
