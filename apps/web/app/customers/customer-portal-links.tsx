"use client";

import {
  getCustomerPortalAccessTokenLabel,
  getCustomerPortalAccessTokenReadinessSummary,
  getCustomerPortalAccessTokenState,
} from "@pest-patrol/domain";
import type { CustomerPortalAccessTokenSummary } from "@pest-patrol/types";
import { useMemo, useState } from "react";

import {
  useCreateCustomerPortalAccessToken,
  useCustomerPortalAccessTokens,
  useRevokeCustomerPortalAccessToken,
} from "../../hooks/useCustomerPortalAccess";

function formatDate(value: string | null) {
  if (!value) {
    return "No expiration";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(value));
}

function formatOpened(value: string | null) {
  return value ? `Opened ${formatDate(value)}` : "Never opened";
}

function expirationToIso(value: string) {
  return value ? `${value}T23:59:59.999Z` : null;
}

function readinessSummaryItems(tokens: CustomerPortalAccessTokenSummary[]) {
  const summary = getCustomerPortalAccessTokenReadinessSummary(tokens);

  return {
    active: `${summary.active} active${summary.active === 1 ? "" : " links"}`,
    expired: `${summary.expired} expired`,
    neverUsed: `${summary.neverUsed} never opened`,
    revoked: `${summary.revoked} revoked`,
    summary,
  };
}

async function copyText(value: string) {
  if (!navigator.clipboard) {
    throw new Error("Clipboard is unavailable");
  }

  await navigator.clipboard.writeText(value);
}

function newestFirst(
  tokens: CustomerPortalAccessTokenSummary[],
): CustomerPortalAccessTokenSummary[] {
  return [...tokens].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

function activeTokens(tokens: CustomerPortalAccessTokenSummary[]) {
  return tokens.filter((token) => getCustomerPortalAccessTokenState(token) === "active");
}

function latestOpenedAt(tokens: CustomerPortalAccessTokenSummary[]) {
  return tokens
    .map((token) => token.last_used_at)
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
}

function tokenRowLabel(token: CustomerPortalAccessTokenSummary) {
  const state = getCustomerPortalAccessTokenState(token);

  if (state === "active" && !token.expires_at) {
    return "Active - no expiration";
  }

  return getCustomerPortalAccessTokenLabel(token);
}

function tokenExpiryText(token: CustomerPortalAccessTokenSummary) {
  const state = getCustomerPortalAccessTokenState(token);

  if (state === "expired") {
    return `Expired ${formatDate(token.expires_at)}`;
  }

  if (token.expires_at) {
    return `Expires ${formatDate(token.expires_at)}`;
  }

  return "No expiration";
}

export function CustomerPortalLinks({
  customerId,
}: {
  customerId: string;
}) {
  const tokensQuery = useCustomerPortalAccessTokens(customerId);
  const createToken = useCreateCustomerPortalAccessToken();
  const revokeToken = useRevokeCustomerPortalAccessToken(customerId);
  const tokens = useMemo(() => tokensQuery.data ?? [], [tokensQuery.data]);
  const sortedTokens = useMemo(() => newestFirst(tokens), [tokens]);
  const active = useMemo(() => activeTokens(tokens), [tokens]);
  const readiness = readinessSummaryItems(tokens);
  const [expiresAt, setExpiresAt] = useState("");
  const [latestLink, setLatestLink] = useState<string | null>(null);
  const [copyUnavailable, setCopyUnavailable] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function generateLink() {
    setMessage(null);
    setCopyUnavailable(false);

    const grant = await createToken
      .mutateAsync({
        customer_id: customerId,
        expires_at: expirationToIso(expiresAt),
      })
      .catch(() => null);

    if (!grant) {
      return;
    }

    setLatestLink(grant.portal_url);

    try {
      await copyText(grant.portal_url);
      setMessage("Link copied to clipboard.");
    } catch {
      setCopyUnavailable(true);
    }
  }

  async function copyLatestLink() {
    if (!latestLink) {
      return;
    }

    setMessage(null);
    try {
      await copyText(latestLink);
      setCopyUnavailable(false);
      setMessage("Link copied to clipboard.");
    } catch {
      setCopyUnavailable(true);
      setMessage(null);
    }
  }

  function resetLatestLink() {
    setLatestLink(null);
    setCopyUnavailable(false);
    setMessage(null);
  }

  const readinessCard = (() => {
    if (tokensQuery.isLoading) {
      return {
        body: "Checking customer portal access.",
        label: "Loading portal status...",
        tone: "border-l-gray-300",
      };
    }

    if (tokensQuery.error) {
      return {
        body: "Use retry to reload portal access history.",
        label: "Could not load portal links.",
        tone: "border-l-red-500",
      };
    }

    if (tokens.length === 0) {
      return {
        body: "Generate a link to share the customer portal.",
        label: "No portal links",
        tone: "border-l-gray-300",
      };
    }

    if (active.length > 1) {
      return {
        body: "Consider revoking older links before sharing again.",
        label: `${active.length} active links`,
        tone: "border-l-amber-400",
      };
    }

    if (active.length === 1) {
      const openedAt = latestOpenedAt(active);

      if (openedAt) {
        return {
          body: `Last opened ${formatDate(openedAt)}.`,
          label: "Customer has accessed the portal",
          tone: "border-l-emerald-500",
        };
      }

      return {
        body: "A portal link exists but has not been opened.",
        label: "Shared - not yet opened",
        tone: "border-l-amber-400",
      };
    }

    return {
      body: "All previous links are expired or revoked.",
      label: "No active links",
      tone: "border-l-gray-300",
    };
  })();

  return (
    <section className="mt-4 border-t border-gray-100 pt-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-neutralDark">Portal access</h3>
          <p className="mt-1 text-xs text-gray-500">
            Generate links to share the customer portal.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="flex flex-col gap-1 text-xs font-semibold text-gray-600">
            Expires
            <input
              className="min-h-10 rounded-md border border-gray-300 px-3 text-sm font-normal text-neutralDark outline-none focus:border-primary"
              disabled={createToken.isPending}
              onChange={(event) => setExpiresAt(event.target.value)}
              type="date"
              value={expiresAt}
            />
          </label>
          <button
            className="min-h-10 rounded-md bg-primary px-3 text-sm font-semibold text-white hover:bg-blue-900 disabled:cursor-not-allowed disabled:bg-gray-400"
            disabled={createToken.isPending}
            onClick={() => void generateLink()}
            type="button"
          >
            {createToken.isPending ? "Generating..." : "Generate link"}
          </button>
        </div>
      </div>

      <div
        className={`mt-3 rounded-md border border-l-4 border-gray-200 bg-white p-3 text-sm ${readinessCard.tone}`}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-semibold text-neutralDark">{readinessCard.label}</p>
            <p className="mt-0.5 text-xs text-gray-600">{readinessCard.body}</p>
          </div>
          {tokensQuery.error ? (
            <button
              className="min-h-8 rounded-md border border-gray-300 px-3 text-xs font-semibold text-neutralDark hover:bg-gray-50"
              onClick={() => void tokensQuery.refetch()}
              type="button"
            >
              Retry
            </button>
          ) : null}
        </div>
      </div>

      {latestLink ? (
        <div className="mt-3 rounded-md border border-gray-200 bg-gray-50 p-3">
          {copyUnavailable ? (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold text-neutralDark">
                Link ready - copy it manually:
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  className="min-h-10 flex-1 rounded-md border border-gray-300 bg-white px-3 font-mono text-xs text-neutralDark outline-none focus:border-primary"
                  onFocus={(event) => event.currentTarget.select()}
                  readOnly
                  value={latestLink}
                />
                <button
                  className="min-h-10 rounded-md border border-gray-300 px-3 text-sm font-semibold text-neutralDark hover:bg-gray-50"
                  onClick={() => void copyLatestLink()}
                  type="button"
                >
                  Copy
                </button>
              </div>
              <p className="text-xs text-gray-500">
                Paste this into an email or text to share with the customer.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs font-semibold text-accent">
                {message ?? "Link copied to clipboard."}
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  className="min-h-9 rounded-md border border-gray-300 px-3 text-sm font-semibold text-neutralDark hover:bg-gray-50"
                  onClick={() => void copyLatestLink()}
                  type="button"
                >
                  Copy again
                </button>
                <button
                  className="min-h-9 px-1 text-sm font-semibold text-primary hover:underline"
                  onClick={resetLatestLink}
                  type="button"
                >
                  Generate new
                </button>
              </div>
            </div>
          )}
          <p className="mt-2 text-xs italic text-gray-400">
            This link is only available during this session. Reload the page and
            it is gone - generate a new one to reshare.
          </p>
        </div>
      ) : null}

      {createToken.error ? (
        <p className="mt-2 text-xs font-semibold text-red-700">
          Could not generate portal link. Try again.
        </p>
      ) : null}
      {revokeToken.error ? (
        <p className="mt-2 text-xs font-semibold text-red-700">
          Could not revoke link. Try again.
        </p>
      ) : null}

      <div className="mt-3 rounded-md border border-gray-200 bg-gray-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Portal readiness
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {[readiness.active, readiness.expired, readiness.revoked, readiness.neverUsed].map(
            (item) => (
              <span
                className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-neutralDark"
                key={item}
              >
                {item}
              </span>
            ),
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-2">
        {tokensQuery.isLoading ? (
          <>
            <div
              className="h-12 animate-pulse rounded bg-gray-100"
              data-testid="portal-link-skeleton"
            />
            <div
              className="h-12 animate-pulse rounded bg-gray-100"
              data-testid="portal-link-skeleton"
            />
          </>
        ) : tokensQuery.error || tokens.length === 0 ? (
          null
        ) : (
          <div className="divide-y divide-gray-100 rounded-md border border-gray-200 bg-gray-50">
            {sortedTokens.map((token) => {
            const state = getCustomerPortalAccessTokenState(token);
            const isActive = state === "active";

            return (
              <div
                className="flex flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                key={token.id}
              >
                <div>
                  <p className="text-xs font-semibold text-neutralDark">
                    <span
                      className={`mr-2 inline-block h-1.5 w-1.5 rounded-full align-middle ${
                        isActive ? "bg-emerald-600" : "bg-gray-400"
                      }`}
                    />
                    {tokenRowLabel(token)}
                  </p>
                  <p className="text-xs text-gray-500">
                    Created {formatDate(token.created_at)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {tokenExpiryText(token)} | {formatOpened(token.last_used_at)}
                  </p>
                </div>
                {isActive ? (
                  <button
                    className="min-h-9 rounded-md border border-red-200 px-3 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={revokeToken.isPending}
                    onClick={() => revokeToken.mutate(token.id)}
                    type="button"
                  >
                    {revokeToken.isPending ? "Revoking..." : "Revoke"}
                  </button>
                ) : null}
              </div>
            );
          })}
          </div>
        )}
      </div>
    </section>
  );
}
