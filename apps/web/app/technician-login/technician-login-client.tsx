"use client";

import { FormEvent, useEffect, useState } from "react";
import { useTechnicianWebAuth } from "../technician-web-auth-context";

type TechnicianInviteLinkResult =
  | { accessToken: string; refreshToken: string }
  | { error: string }
  | null;

function scrubAuthHash() {
  window.history.replaceState(null, "", window.location.pathname);
}

function parseTechnicianInviteLink(hash: string): TechnicianInviteLinkResult {
  if (!hash) {
    return null;
  }

  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const authError = params.get("error_description") ?? params.get("error");

  if (authError) {
    return { error: authError };
  }

  if (params.get("type") !== "invite") {
    return {
      error:
        "This technician invite link is invalid or expired. Ask your dispatcher for a new invite.",
    };
  }

  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");

  if (!accessToken || !refreshToken) {
    return {
      error:
        "This technician invite link is invalid or expired. Ask your dispatcher for a new invite.",
    };
  }

  return { accessToken, refreshToken };
}

function validatePasswordForm(password: string, confirmPassword: string) {
  if (!password.trim()) {
    return "Password is required";
  }

  if (password.length < 8) {
    return "Password must be at least 8 characters";
  }

  if (password !== confirmPassword) {
    return "Passwords do not match";
  }

  return null;
}

export function TechnicianLoginClient() {
  const {
    error: authError,
    establishPasswordRecoverySession,
    signIn,
    status,
    updatePassword,
  } = useTechnicianWebAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteChecked, setInviteChecked] = useState(false);
  const [inviteSessionReady, setInviteSessionReady] = useState(false);
  const [passwordUpdated, setPasswordUpdated] = useState(false);

  useEffect(() => {
    let active = true;

    async function startInviteSession() {
      const hash = window.location.hash;
      const parsed = parseTechnicianInviteLink(hash);

      if (hash) {
        scrubAuthHash();
      }

      if (!parsed) {
        setInviteChecked(true);
        return;
      }

      if ("error" in parsed) {
        setInviteError(parsed.error);
        setInviteChecked(true);
        return;
      }

      try {
        await establishPasswordRecoverySession(
          parsed.accessToken,
          parsed.refreshToken,
        );

        if (!active) {
          return;
        }

        setInviteSessionReady(true);
      } catch (error) {
        if (!active) {
          return;
        }

        setInviteError(
          error instanceof Error
            ? error.message
            : "This technician invite link is invalid or expired. Ask your dispatcher for a new invite.",
        );
      } finally {
        if (active) {
          setInviteChecked(true);
        }
      }
    }

    void startInviteSession();

    return () => {
      active = false;
    };
  }, [establishPasswordRecoverySession]);

  async function submitSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    if (!email.trim() || !password.trim()) {
      setFormError("Email and password are required.");
      return;
    }

    try {
      await signIn(email, password);
    } catch {
      // The auth hook owns the user-facing error.
    }
  }

  async function submitPasswordSetup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setPasswordUpdated(false);

    const validationError = validatePasswordForm(newPassword, confirmPassword);

    if (validationError) {
      setFormError(validationError);
      return;
    }

    try {
      await updatePassword(newPassword, confirmPassword);
      setPasswordUpdated(true);
      setInviteSessionReady(false);
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      // The auth hook owns the user-facing error.
    }
  }

  const visibleError = formError ?? authError;

  if (!inviteChecked) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutralLight px-6">
        <p className="text-sm font-semibold text-gray-600">
          Checking technician invite...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutralLight px-6 py-16">
      <section className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[1fr_420px] lg:items-center">
        <div className="space-y-5">
          <p className="text-sm font-bold uppercase text-secondary">
            Pest Patrol OS
          </p>
          <h1 className="text-4xl font-bold text-neutralDark">
            Technician sign-in
          </h1>
          <p className="max-w-2xl text-base leading-7 text-gray-600">
            Field technicians can set their password from an invite, then use
            their technician account for assigned work.
          </p>
        </div>

        {inviteError ? (
          <div className="rounded-lg border border-red-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-red-700">
              {inviteError}
            </p>
          </div>
        ) : inviteSessionReady ? (
          <form
            className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
            onSubmit={submitPasswordSetup}
          >
            <div className="space-y-5">
              <h2 className="text-2xl font-bold text-neutralDark">
                Set technician password
              </h2>

              <div>
                <label
                  className="text-sm font-semibold text-neutralDark"
                  htmlFor="technician-new-password"
                >
                  New password
                </label>
                <input
                  autoComplete="new-password"
                  className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-neutralDark outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  id="technician-new-password"
                  onChange={(event) => setNewPassword(event.target.value)}
                  type="password"
                  value={newPassword}
                />
              </div>

              <div>
                <label
                  className="text-sm font-semibold text-neutralDark"
                  htmlFor="technician-confirm-password"
                >
                  Confirm password
                </label>
                <input
                  autoComplete="new-password"
                  className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-neutralDark outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  id="technician-confirm-password"
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  type="password"
                  value={confirmPassword}
                />
              </div>

              {visibleError ? (
                <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                  {visibleError}
                </p>
              ) : null}

              <button
                className="w-full rounded-md bg-primary px-4 py-2 text-sm font-bold text-white transition hover:bg-primary/90"
                type="submit"
              >
                Set password
              </button>
            </div>
          </form>
        ) : (
          <form
            className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
            onSubmit={submitSignIn}
          >
            <div className="space-y-5">
              {passwordUpdated ? (
                <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm font-semibold text-green-700">
                  Password set. You can now sign in here with your technician
                  account.
                </p>
              ) : null}

              <div>
                <label
                  className="text-sm font-semibold text-neutralDark"
                  htmlFor="technician-email"
                >
                  Email
                </label>
                <input
                  autoComplete="email"
                  className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-neutralDark outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  id="technician-email"
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  value={email}
                />
              </div>

              <div>
                <label
                  className="text-sm font-semibold text-neutralDark"
                  htmlFor="technician-password"
                >
                  Password
                </label>
                <input
                  autoComplete="current-password"
                  className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-neutralDark outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  id="technician-password"
                  onChange={(event) => setPassword(event.target.value)}
                  type="password"
                  value={password}
                />
              </div>

              {visibleError ? (
                <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                  {visibleError}
                </p>
              ) : null}

              {status === "signed_in" ? (
                <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm font-semibold text-green-700">
                  Signed in. Assigned field work is available in the mobile app.
                </p>
              ) : null}

              <button
                className="w-full rounded-md bg-primary px-4 py-2 text-sm font-bold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={status === "loading"}
                type="submit"
              >
                {status === "loading" ? "Signing in..." : "Sign in"}
              </button>
            </div>
          </form>
        )}
      </section>
    </main>
  );
}
