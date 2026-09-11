"use client";

import {
  establishPasswordRecoverySession,
  signInTechnician,
  signOutTechnician,
  updateCurrentUserPassword,
  validateTechnicianAccess,
} from "@pest-patrol/application";
import { useState } from "react";
import { createAuthAdapter } from "@pest-patrol/api-client";

import { browserSupabase } from "../lib/supabase-browser";

const authPort = createAuthAdapter(browserSupabase);


type TechnicianWebAuthStatus = "signed_in" | "signed_out" | "loading";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unable to authenticate";
}

export function useTechnicianWebAuth() {
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<TechnicianWebAuthStatus>("signed_out");

  async function startPasswordRecoverySession(
    accessToken: string,
    refreshToken: string,
  ) {
    setError(null);
    // validateTechnicianAccess is what refuses an invite link built from
    // someone else's tokens: the session has to resolve to a profile whose
    // role is technician before the password form on this page is reachable.
    const record = await establishPasswordRecoverySession(
      authPort,
      { accessToken, refreshToken },
      validateTechnicianAccess,
    );

    return record.session.user.email ?? null;
  }

  async function signIn(email: string, password: string) {
    setError(null);
    setStatus("loading");

    try {
      await signInTechnician(authPort, { email, password });
      setStatus("signed_in");
    } catch (signInError) {
      setError(errorMessage(signInError));
      setStatus("signed_out");
      throw signInError;
    }
  }

  async function updatePassword(password: string, confirmPassword: string) {
    setError(null);

    try {
      await updateCurrentUserPassword(authPort, { password, confirmPassword });
    } catch (updateError) {
      setError(errorMessage(updateError));
      throw updateError;
    }
  }

  /**
   * A technician who signs in here on a shared office machine had no way to
   * end the session: supabase-js keeps it in localStorage and the page offered
   * nothing but a confirmation message, so the next person at that browser
   * inherited it. Global scope is right for an explicit sign-out -- the point
   * of pressing it on a borrowed machine is to be signed out.
   */
  async function signOut() {
    setError(null);

    try {
      await signOutTechnician(authPort);
      setStatus("signed_out");
    } catch (signOutError) {
      setError(errorMessage(signOutError));
      throw signOutError;
    }
  }

  return {
    error,
    establishPasswordRecoverySession: startPasswordRecoverySession,
    signIn,
    signOut,
    status,
    updatePassword,
  };
}
