"use client";

import { FormEvent, useState } from "react";
import { useAdminAuth } from "./admin-auth-context";

export function AdminSignIn() {
  const { error, signIn, status } = useAdminAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const submitting = status === "loading";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    if (!email.trim() || !password.trim()) {
      setFormError("Email and password are required.");
      return;
    }

    await signIn(email, password);
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
          <p className="max-w-2xl text-base leading-7 text-gray-600">
            Dispatch, customer, billing, inventory, automation, and closeout
            workflows are available to admin and dispatcher profiles.
          </p>
        </div>

        <form
          className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
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
                className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-neutralDark outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
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
                className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-neutralDark outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                id="admin-password"
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                value={password}
              />
            </div>

            {formError || error ? (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                {formError ?? error}
              </p>
            ) : null}

            <button
              className="w-full rounded-md bg-primary px-4 py-2 text-sm font-bold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={submitting}
              type="submit"
            >
              {submitting ? "Signing in..." : "Sign in"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
