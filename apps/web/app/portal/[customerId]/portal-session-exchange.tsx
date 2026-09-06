"use client";

import { useEffect, useState } from "react";

interface PortalSessionExchangeResponse {
  error?: string;
  redirectTo?: string;
}

export function PortalSessionExchange({
  customerId,
  grant,
}: {
  customerId: string;
  grant: string;
}) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function exchangeGrant() {
      let body: PortalSessionExchangeResponse | null = null;

      try {
        const response = await fetch(
          `/api/portal/${encodeURIComponent(customerId)}/sessions`,
          {
            body: JSON.stringify({ grant }),
            headers: { "content-type": "application/json" },
            method: "POST",
          },
        );

        body = (await response.json().catch(() => null)) as
          | PortalSessionExchangeResponse
          | null;

        if (cancelled) {
          return;
        }

        if (response.ok && body?.redirectTo) {
          window.location.replace(body.redirectTo);
          return;
        }
      } catch {
        if (cancelled) {
          return;
        }
      }

      setErrorMessage(
        body?.error ?? "This portal link is invalid or expired.",
      );
    }

    void exchangeGrant();

    return () => {
      cancelled = true;
    };
  }, [customerId, grant]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-3 px-6 text-center">
      {errorMessage ? (
        <>
          <p className="text-lg font-semibold text-theme-text-primary">
            {errorMessage}
          </p>
          <p className="text-sm text-theme-text-secondary">
            Contact your pest control provider for a new link.
          </p>
        </>
      ) : (
        <p className="text-sm text-theme-text-secondary">
          Opening your portal…
        </p>
      )}
    </main>
  );
}
