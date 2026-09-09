"use client";

import {
  establishPasswordRecoverySession,
  signInTechnician,
  updateCurrentUserPassword,
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
    await establishPasswordRecoverySession(authPort, {
      accessToken,
      refreshToken,
    });
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

  return {
    error,
    establishPasswordRecoverySession: startPasswordRecoverySession,
    signIn,
    status,
    updatePassword,
  };
}
