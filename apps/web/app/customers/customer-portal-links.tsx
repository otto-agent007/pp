"use client";

import {
  getCustomerPortalAccessTokenLabel,
  getCustomerPortalAccessTokenState,
} from "@pest-patrol/domain";
import { useState } from "react";

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
  }).format(new Date(value));
}

function formatLastUsed(value: string | null) {
  return value ? formatDate(value) : "Never";
}

function expirationToIso(value: string) {
  return value ? `${value}T23:59:59.999Z` : null;
}

async function copyText(value: string) {
  if (!navigator.clipboard) {
    throw new Error("Clipboard is unavailable");
  }

  await navigator.clipboard.writeText(value);
}

export function CustomerPortalLinks({
  customerId,
}: {
  customerId: string;
}) {
  const tokensQuery = useCustomerPortalAccessTokens(customerId);
  const createToken = useCreateCustomerPortalAccessToken();
  const revokeToken = useRevokeCustomerPortalAccessToken(customerId);
  const [expiresAt, setExpiresAt] = useState("");
  const [latestLink, setLatestLink] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function generateLink() {
    setMessage(null);

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
      setMessage("Portal link copied");
    } catch {
      setMessage("Portal link generated; copy it from latest link");
    }
  }

  async function copyLatestLink() {
    if (!latestLink) {
      return;
    }

    setMessage(null);
    try {
      await copyText(latestLink);
      setMessage("Portal link copied");
    } catch {
      setMessage("Clipboard is unavailable");
    }
  }

  return (
    <section className="mt-4 border-t border-gray-100 pt-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-neutralDark">Portal link</h3>
          <p className="mt-1 text-xs text-gray-500">
            Generate customer access links for completed closeouts.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="flex flex-col gap-1 text-xs font-semibold text-gray-600">
            Expires
            <input
              className="min-h-10 rounded-md border border-gray-300 px-3 text-sm font-normal text-neutralDark outline-none focus:border-primary"
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
            {createToken.isPending ? "Generating" : "Generate link"}
          </button>
          {latestLink ? (
            <button
              className="min-h-10 rounded-md border border-gray-300 px-3 text-sm font-semibold text-neutralDark hover:bg-gray-50"
              onClick={() => void copyLatestLink()}
              type="button"
            >
              Copy latest link
            </button>
          ) : null}
        </div>
      </div>

      {message ? <p className="mt-2 text-xs font-semibold text-accent">{message}</p> : null}
      {createToken.error ? (
        <p className="mt-2 text-xs font-semibold text-red-700">
          Unable to generate portal link
        </p>
      ) : null}
      {revokeToken.error ? (
        <p className="mt-2 text-xs font-semibold text-red-700">
          Unable to revoke portal link
        </p>
      ) : null}

      <div className="mt-3 flex flex-col gap-2">
        {tokensQuery.isLoading ? (
          <p className="text-xs text-gray-500">Loading portal links</p>
        ) : (tokensQuery.data ?? []).length === 0 ? (
          <p className="text-xs text-gray-500">No portal links generated</p>
        ) : (
          (tokensQuery.data ?? []).map((token) => {
            const state = getCustomerPortalAccessTokenState(token);

            return (
              <div
                className="flex flex-col gap-2 rounded-md border border-gray-200 bg-gray-50 p-3 sm:flex-row sm:items-center sm:justify-between"
                key={token.id}
              >
                <div>
                  <p className="text-sm font-semibold text-neutralDark">
                    {getCustomerPortalAccessTokenLabel(token)}
                  </p>
                  <p className="text-xs text-gray-500">
                    Created {formatDate(token.created_at)} | Expires{" "}
                    {formatDate(token.expires_at)}
                  </p>
                  <p className="text-xs text-gray-500">
                    Last used {formatLastUsed(token.last_used_at)}
                  </p>
                </div>
                {state === "active" ? (
                  <button
                    className="min-h-9 rounded-md border border-red-200 px-3 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={revokeToken.isPending}
                    onClick={() => revokeToken.mutate(token.id)}
                    type="button"
                  >
                    Revoke
                  </button>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
