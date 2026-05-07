"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useAdminAuth } from "../../admin-auth-context";

type RecoveryLinkResult =
  | { accessToken: string; refreshToken: string }
  | { error: string };

function scrubAuthHash() {
  window.history.replaceState(null, "", window.location.pathname);
}

function parseRecoveryLink(hash: string): RecoveryLinkResult {
  if (!hash) {
    return {
      error:
        "This password reset link is missing or expired. Request a new password reset link.",
    };
  }

  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const authError = params.get("error_description") ?? params.get("error");

  if (authError) {
    return { error: authError };
  }

  if (params.get("type") !== "recovery") {
    return {
      error:
        "This password reset link is invalid. Request a new password reset link.",
    };
  }

  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");

  if (!accessToken || !refreshToken) {
    return {
      error:
        "This password reset link is missing or expired. Request a new password reset link.",
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

export function UpdatePasswordClient() {
  const { establishPasswordRecoverySession, updatePassword } = useAdminAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [updated, setUpdated] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linkChecked, setLinkChecked] = useState(false);
  const [recoverySessionReady, setRecoverySessionReady] = useState(false);

  useEffect(() => {
    let active = true;

    async function startRecoverySession() {
      const hash = window.location.hash;
      const parsed = parseRecoveryLink(hash);

      if (hash) {
        scrubAuthHash();
      }

      if ("error" in parsed) {
        setLinkError(parsed.error);
        setLinkChecked(true);
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

        setRecoverySessionReady(true);
        setLinkError(null);
      } catch (sessionError) {
        if (!active) {
          return;
        }

        setLinkError(
          sessionError instanceof Error
            ? sessionError.message
            : "Unable to start password recovery session",
        );
      } finally {
        if (active) {
          setLinkChecked(true);
        }
      }
    }

    void startRecoverySession();

    return () => {
      active = false;
    };
  }, [establishPasswordRecoverySession]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setUpdated(false);

    const validationError = validatePasswordForm(password, confirmPassword);

    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);

    try {
      await updatePassword(password, confirmPassword);
      setUpdated(true);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to update password",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-neutralLight px-6 py-16">
      <section className="mx-auto max-w-md">
        <div className="mb-6 space-y-3">
          <p className="text-sm font-bold uppercase text-secondary">
            Pest Patrol OS
          </p>
          <h1 className="text-3xl font-bold text-neutralDark">
            Update password
          </h1>
        </div>

        {!linkChecked ? (
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-gray-600">
              Checking password reset link...
            </p>
          </div>
        ) : linkError || !recoverySessionReady ? (
          <div className="rounded-lg border border-red-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-red-700">
              {linkError ??
                "This password reset link is missing or expired. Request a new password reset link."}
            </p>
            <Link
              className="mt-5 block text-sm font-semibold text-primary transition hover:text-primary/80"
              href="/forgot-password"
            >
              Request a new reset link
            </Link>
          </div>
        ) : (
          <form
            className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
            onSubmit={handleSubmit}
          >
            <div className="space-y-5">
              <div>
                <label
                  className="text-sm font-semibold text-neutralDark"
                  htmlFor="new-password"
                >
                  New password
                </label>
                <input
                  autoComplete="new-password"
                  className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-neutralDark outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  id="new-password"
                  onChange={(event) => setPassword(event.target.value)}
                  type="password"
                  value={password}
                />
              </div>

              <div>
                <label
                  className="text-sm font-semibold text-neutralDark"
                  htmlFor="confirm-password"
                >
                  Confirm password
                </label>
                <input
                  autoComplete="new-password"
                  className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-neutralDark outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  id="confirm-password"
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  type="password"
                  value={confirmPassword}
                />
              </div>

              {error ? (
                <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                  {error}
                </p>
              ) : null}

              {updated ? (
                <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm font-semibold text-green-700">
                  Password updated. You can now sign in.
                </p>
              ) : null}

              <button
                className="w-full rounded-md bg-primary px-4 py-2 text-sm font-bold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={submitting}
                type="submit"
              >
                {submitting ? "Updating..." : "Update password"}
              </button>
            </div>
          </form>
        )}
      </section>
    </main>
  );
}
