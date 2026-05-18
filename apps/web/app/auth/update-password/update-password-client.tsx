"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useAdminAuth } from "../../admin-auth-context";

type PasswordSetupLinkResult =
  | { accessToken: string; refreshToken: string; type: "invite" | "recovery" }
  | { error: string };

function scrubAuthHash() {
  window.history.replaceState(null, "", window.location.pathname);
}

function parsePasswordSetupLink(hash: string): PasswordSetupLinkResult {
  if (!hash) {
    return {
      error:
        "This password setup link is missing or expired. Request a new password reset link.",
    };
  }

  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const authError = params.get("error_description") ?? params.get("error");

  if (authError) {
    return { error: authError };
  }

  const linkType = params.get("type");

  if (linkType !== "recovery" && linkType !== "invite") {
    return {
      error:
        "This password setup link is invalid. Request a new password reset link.",
    };
  }

  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");

  if (!accessToken || !refreshToken) {
    return {
      error:
        "This password setup link is missing or expired. Request a new password reset link.",
    };
  }

  return { accessToken, refreshToken, type: linkType };
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
  const [passwordSessionReady, setPasswordSessionReady] = useState(false);

  useEffect(() => {
    let active = true;

    async function startPasswordSession() {
      const hash = window.location.hash;
      const parsed = parsePasswordSetupLink(hash);

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

        setPasswordSessionReady(true);
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

    void startPasswordSession();

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
          <div className="rounded-lg border border-theme-border-subtle bg-theme-background-surface p-6 shadow-sm">
            <p className="text-sm font-semibold text-theme-text-secondary">
              Checking password reset link...
            </p>
          </div>
        ) : linkError || !passwordSessionReady ? (
          <div className="rounded-lg border border-status-alert-danger-border bg-theme-background-surface p-6 shadow-sm">
            <p className="text-sm font-semibold text-status-alert-danger-fg">
              {linkError ??
                "This password setup link is missing or expired. Request a new password reset link."}
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
            className="rounded-lg border border-theme-border-subtle bg-theme-background-surface p-6 shadow-sm"
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
                  className="mt-2 w-full rounded-md border border-theme-border-default px-3 py-2 text-sm text-neutralDark outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
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
                  className="mt-2 w-full rounded-md border border-theme-border-default px-3 py-2 text-sm text-neutralDark outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  id="confirm-password"
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  type="password"
                  value={confirmPassword}
                />
              </div>

              {error ? (
                <p className="rounded-md border border-status-alert-danger-border bg-status-alert-danger-bg px-3 py-2 text-sm font-semibold text-status-alert-danger-fg">
                  {error}
                </p>
              ) : null}

              {updated ? (
                <p className="rounded-md border border-status-alert-success-border bg-status-alert-success-bg px-3 py-2 text-sm font-semibold text-status-alert-success-fg">
                  Password updated. You can now sign in.
                </p>
              ) : null}

              <button
                className="w-full rounded-md bg-primary px-4 py-2 text-sm font-bold text-theme-text-inverse transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
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
