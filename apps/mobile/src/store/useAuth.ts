import {
  getCurrentTechnicianAuth,
  signInTechnician,
  signOutTechnician,
} from "@pest-patrol/application";
import type { UserProfile } from "@pest-patrol/types";
import type { Session, Subscription } from "@supabase/supabase-js";
import { create } from "zustand";

import { mobileSupabase } from "../lib/supabase";

type AuthStatus = "loading" | "signed_in" | "signed_out";

interface AuthState {
  error: string | null;
  initialize: () => Promise<void>;
  profile: UserProfile | null;
  session: Session | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  status: AuthStatus;
}

let authSubscription: Subscription | null = null;

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unable to update auth state";
}

export const useAuth = create<AuthState>((set, get) => ({
  error: null,
  profile: null,
  session: null,
  status: "loading",
  initialize: async () => {
    if (authSubscription) {
      return;
    }

    set({ error: null, status: "loading" });

    try {
      const record = await getCurrentTechnicianAuth(mobileSupabase);

      set({
        error: null,
        profile: record?.profile ?? null,
        session: record?.session ?? null,
        status: record ? "signed_in" : "signed_out",
      });
    } catch (error) {
      set({
        error: errorMessage(error),
        profile: null,
        session: null,
        status: "signed_out",
      });
    }

    const { data } = mobileSupabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        set({ error: null, profile: null, session: null, status: "signed_out" });
        return;
      }

      void getCurrentTechnicianAuth(mobileSupabase)
        .then((record) => {
          set({
            error: null,
            profile: record?.profile ?? null,
            session: record?.session ?? null,
            status: record ? "signed_in" : "signed_out",
          });
        })
        .catch((error) => {
          set({
            error: errorMessage(error),
            profile: null,
            session: null,
            status: "signed_out",
          });
        });
    });

    authSubscription = data.subscription;
  },
  signIn: async (email, password) => {
    set({ error: null, status: "loading" });

    try {
      const record = await signInTechnician(mobileSupabase, { email, password });

      if (!record) {
        throw new Error("Unable to start session");
      }

      set({
        error: null,
        profile: record.profile,
        session: record.session,
        status: "signed_in",
      });
    } catch (error) {
      set({
        error: errorMessage(error),
        profile: null,
        session: null,
        status: "signed_out",
      });
    }
  },
  signOut: async () => {
    set({ error: null, status: "loading" });

    try {
      await signOutTechnician(mobileSupabase);
      set({ error: null, profile: null, session: null, status: "signed_out" });
    } catch (error) {
      set({
        ...get(),
        error: errorMessage(error),
        status: get().session ? "signed_in" : "signed_out",
      });
    }
  },
}));
