"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import {
  DEMO_SEED_ADMIN_EMAIL,
  DEMO_SEED_ADMIN_PASSWORD,
} from "@pest-patrol/domain";
import {
  Button,
  formControlClassName,
  formLabelClassName,
} from "@pest-patrol/ui";
import { usePrepareLocalDemoLogin } from "../hooks/useDemoSeed";
import { useAdminAuth } from "./admin-auth-context";
import { Wordmark } from "./brand";

const showLocalDemoShortcut = process.env.NODE_ENV !== "production";

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Unable to prepare demo login";
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
      const prepared = await prepareDemoLogin.mutateAsync();

      if (prepared.status?.environment_label === "Local fixture demo") {
        await signInLocalDemo();
        return;
      }

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
    <main className="min-h-screen bg-theme-background-canvas px-6 py-16 text-theme-text-primary">
      <section className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[1fr_420px] lg:items-center">
        <div className="space-y-5">
          <Wordmark label="Pest Patrol OS" width={220} />
          <p className="text-sm font-bold uppercase text-primitive-sky-600">
            Field-ready operations
          </p>
          <h1 className="text-4xl font-bold text-theme-text-primary">
            Admin operations sign-in
          </h1>
          <p className="max-w-2xl text-base leading-7 text-theme-text-secondary">
            Run the day from one field-ready workspace: dispatch routes,
            customer context, billing handoffs, inventory, automation, and
            closeout proof stay connected for the office and technicians.
          </p>
        </div>

        <form
          className="rounded-lg border border-theme-border-subtle bg-theme-background-surface p-6 shadow-sm"
          onSubmit={handleSubmit}
        >
          <div className="space-y-5">
            <label className={formLabelClassName} htmlFor="admin-email">
              Email
              <input
                autoComplete="email"
                className={formControlClassName}
                id="admin-email"
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                value={email}
              />
            </label>

            <label className={formLabelClassName} htmlFor="admin-password">
              Password
              <input
                autoComplete="current-password"
                className={formControlClassName}
                id="admin-password"
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                value={password}
              />
            </label>

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
                <Button
                  className="mt-3"
                  disabled={submitting}
                  fullWidth
                  onClick={signInDemo}
                  variant="ghost"
                  type="button"
                >
                  {submitting ? "Logging in..." : "Log in as demo"}
                </Button>
              </div>
            ) : null}

            <Button disabled={submitting} fullWidth type="submit">
              {submitting ? "Signing in..." : "Sign in"}
            </Button>

            <Link
              className="block text-center text-sm font-semibold text-theme-action-primary transition hover:text-theme-action-primaryStrong"
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
