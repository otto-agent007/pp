"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useAdminAuth } from "../admin-auth-context";

function resetRedirectUrl() {
  return new URL("/auth/update-password", window.location.origin).toString();
}

export function ForgotPasswordClient() {
  const { requestPasswordReset } = useAdminAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSent(false);

    if (!email.trim()) {
      setError("Email is required");
      return;
    }

    setSubmitting(true);

    try {
      await requestPasswordReset(email, resetRedirectUrl());
      setSent(true);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to send password reset link",
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
            Reset your password
          </h1>
          <p className="text-sm leading-6 text-gray-600">
            Enter your admin email and we will send a recovery link to your
            inbox.
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
                htmlFor="reset-email"
              >
                Email
              </label>
              <input
                autoComplete="email"
                className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-neutralDark outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                id="reset-email"
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                value={email}
              />
            </div>

            {error ? (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                {error}
              </p>
            ) : null}

            {sent ? (
              <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm font-semibold text-green-700">
                Check your email for a password reset link.
              </p>
            ) : null}

            <button
              className="w-full rounded-md bg-primary px-4 py-2 text-sm font-bold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={submitting}
              type="submit"
            >
              {submitting ? "Sending..." : "Send reset link"}
            </button>

            <Link
              className="block text-center text-sm font-semibold text-primary transition hover:text-primary/80"
              href="/"
            >
              Back to sign in
            </Link>
          </div>
        </form>
      </section>
    </main>
  );
}
