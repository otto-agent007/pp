"use client";

import { supabase } from "@pest-patrol/api-client";
import {
  establishPasswordRecoverySession,
  signInTechnician,
  updateCurrentUserPassword,
} from "@pest-patrol/domain";
import { useState } from "react";

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
    await establishPasswordRecoverySession(supabase, {
      accessToken,
      refreshToken,
    });
  }

  async function signIn(email: string, password: string) {
    setError(null);
    setStatus("loading");

    try {
      await signInTechnician(supabase, { email, password });
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
      await updateCurrentUserPassword(supabase, { password, confirmPassword });
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
