"use client";

import { useEffect, useRef, useState } from "react";

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
  // The grant is one-time: the route claims it with a conditional UPDATE, so
  // the second POST of the same grant is always rejected. React runs this
  // effect twice on the same instance under StrictMode -- mount, clean up,
  // mount again -- and the original per-run `cancelled` flag only suppressed
  // the state update, because the first request had already left. The first
  // claim burned the grant and the second failed, so every portal link was
  // dead in `next dev`.
  //
  // Two refs, because one is not enough. claimedGrantRef survives the
  // simulated remount and stops the second request. activeRef has to be reset
  // at the top of every run: the cleanup between the two runs would otherwise
  // leave the single in-flight request looking cancelled, and the result of
  // the only claim we make would be thrown away. On a real unmount the cleanup
  // runs last and it stays false.
  const claimedGrantRef = useRef<string | null>(null);
  const activeRef = useRef(true);

  useEffect(() => {
    activeRef.current = true;

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

        if (!activeRef.current) {
          return;
        }

        if (response.ok && body?.redirectTo) {
          window.location.replace(body.redirectTo);
          return;
        }
      } catch {
        if (!activeRef.current) {
          return;
        }
      }

      setErrorMessage(
        body?.error ?? "This portal link is invalid or expired.",
      );
    }

    if (claimedGrantRef.current !== grant) {
      claimedGrantRef.current = grant;
      void exchangeGrant();
    }

    return () => {
      activeRef.current = false;
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
