"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import {
  DEMO_SEED_ADMIN_EMAIL,
  DEMO_SEED_ADMIN_PASSWORD,
} from "@pest-patrol/domain";
import { usePrepareLocalDemoLogin } from "../hooks/useDemoSeed";
import { useAdminAuth } from "./admin-auth-context";

const showLocalDemoShortcut = process.env.NODE_ENV !== "production";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unable to prepare demo login";
}

export function AdminSignIn() {
  const { error, signIn, signInLocalDemo, status } = useAdminAuth();
  const prepareDemoLogin = usePrepareLocalDemoLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const submitting = status === "loading" || prepareDemoLogin.isPending;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    if (!email.trim() || !password.trim()) {
      setFormError("Email and password are required.");
      return;
    }

    await signIn(email, password);
  }

  async function signInDemo() {
    setEmail(DEMO_SEED_ADMIN_EMAIL);
    setPassword(DEMO_SEED_ADMIN_PASSWORD);
    setFormError(null);

    try {
      await prepareDemoLogin.mutateAsync();
      await signIn(DEMO_SEED_ADMIN_EMAIL, DEMO_SEED_ADMIN_PASSWORD);
    } catch (error) {
      try {
        await signInLocalDemo();
        return;
      } catch {
        // Keep the seed/login error visible when fixture mode is not allowed.
      }

      setFormError(errorMessage(error));
    }
  }

  return (
    <main className="min-h-screen bg-neutralLight px-6 py-16">
      <section className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[1fr_420px] lg:items-center">
        <div className="space-y-5">
          <p className="text-sm font-bold uppercase text-secondary">
            Pest Patrol OS
          </p>
          <h1 className="text-4xl font-bold text-neutralDark">
            Admin operations sign-in
          </h1>
          <p className="max-w-2xl text-base leading-7 text-theme-text-secondary">
            Dispatch, customer, billing, inventory, automation, and closeout
            workflows are available to admin and dispatcher profiles.
          </p>
        </div>

        <form
          className="rounded-lg border border-theme-border-subtle bg-theme-background-surface p-6 shadow-sm"
          onSubmit={handleSubmit}
        >
          <div className="space-y-5">
            <div>
              <label
                className="text-sm font-semibold text-neutralDark"
                htmlFor="admin-email"
              >
                Email
              </label>
              <input
                autoComplete="email"
                className="mt-2 w-full rounded-md border border-theme-border-default px-3 py-2 text-sm text-neutralDark outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                id="admin-email"
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                value={email}
              />
            </div>

            <div>
              <label
                className="text-sm font-semibold text-neutralDark"
                htmlFor="admin-password"
              >
                Password
              </label>
              <input
                autoComplete="current-password"
                className="mt-2 w-full rounded-md border border-theme-border-default px-3 py-2 text-sm text-neutralDark outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                id="admin-password"
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                value={password}
              />
            </div>

            {formError || error ? (
              <p className="rounded-md border border-status-alert-danger-border bg-status-alert-danger-bg px-3 py-2 text-sm font-semibold text-status-alert-danger-fg">
                {formError ?? error}
              </p>
            ) : null}

            {showLocalDemoShortcut ? (
              <div className="border-t border-theme-border-subtle pt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-theme-text-muted">
                  Local demo login
                </p>
                <p className="mt-1 text-sm text-theme-text-secondary">
                  {DEMO_SEED_ADMIN_EMAIL} / {DEMO_SEED_ADMIN_PASSWORD}
                </p>
                <button
                  className="mt-3 w-full rounded-md border border-theme-border-default px-4 py-2 text-sm font-semibold text-neutralDark transition hover:border-primary disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={submitting}
                  onClick={signInDemo}
                  type="button"
                >
                  {submitting ? "Logging in..." : "Log in as demo"}
                </button>
              </div>
            ) : null}

            <button
              className="w-full rounded-md bg-primary px-4 py-2 text-sm font-bold text-theme-text-inverse transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={submitting}
              type="submit"
            >
              {submitting ? "Signing in..." : "Sign in"}
            </button>

            <Link
              className="block text-center text-sm font-semibold text-primary transition hover:text-primary/80"
              href="/forgot-password"
            >
              Forgot password?
            </Link>
          </div>
        </form>
      </section>
    </main>
  );
}
