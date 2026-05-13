"use client";

import {
  getCustomerPortalAccessTokenEventLabel,
  getCustomerPortalAccessTokenLabel,
  getCustomerPortalAccessTokenState,
} from "@pest-patrol/domain";
import type {
  CustomerPortalAccessTokenEventSummary,
  CustomerPortalAccessTokenSummary,
} from "@pest-patrol/types";
import { KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";

import {
  useCreateCustomerPortalAccessToken,
  useCustomerPortalAccessTokenEvents,
  useCustomerPortalAccessTokens,
  useCustomerPortalProviderStatus,
  useRevokeCustomerPortalAccessToken,
  useSendCustomerPortalAccessToken,
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

function eventDetail(event: CustomerPortalAccessTokenEventSummary) {
  if (event.kind === "opened") {
    return "via portal link";
  }

  return "by an admin";
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
    return "Active — no expiration";
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

function revokeConfirmPrompt(token: CustomerPortalAccessTokenSummary) {
  const hasExpiry = Boolean(token.expires_at);
  const hasOpened = Boolean(token.last_used_at);

  if (!hasExpiry && !hasOpened) {
    return "This link is active with no expiration and has never been opened.";
  }

  if (!hasExpiry && hasOpened) {
    return "This link is active with no expiration — the customer has opened it.";
  }

  if (hasExpiry && !hasOpened) {
    return `This link is active and expires ${formatDate(token.expires_at)}. It has never been opened.`;
  }

  return `This link is active and expires ${formatDate(token.expires_at)}. The customer last opened it ${formatDate(token.last_used_at)}.`;
}

function CustomerPortalTokenHistory({
  onCollapse,
  regionId,
  tokenId,
}: {
  onCollapse: () => void;
  regionId: string;
  tokenId: string;
}) {
  const eventsQuery = useCustomerPortalAccessTokenEvents(tokenId);
  const history = eventsQuery.data;
  const events = history?.events ?? [];
  const truncatedBefore = history?.truncated_before ?? null;

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Escape") {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    onCollapse();
  }

  if (eventsQuery.isLoading) {
    return (
      <div
        aria-label="Event history for portal link"
        className="mt-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-500"
        id={regionId}
        onKeyDown={handleKeyDown}
        role="region"
      >
        Loading history...
      </div>
    );
  }

  if (eventsQuery.error) {
    return (
      <div
        aria-label="Event history for portal link"
        className="mt-2 flex items-center justify-between gap-3 rounded-md border border-red-100 bg-white px-3 py-2"
        id={regionId}
        onKeyDown={handleKeyDown}
        role="region"
      >
        <p className="text-xs font-semibold text-red-700">
          {"Couldn't load portal history."}
        </p>
        <button
          className="min-h-8 rounded-md border border-gray-300 px-3 text-xs font-semibold text-neutralDark hover:bg-gray-50"
          onClick={() => void eventsQuery.refetch()}
          type="button"
        >
          Retry
        </button>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div
        aria-label="Event history for portal link"
        className="mt-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-xs text-gray-500"
        id={regionId}
        onKeyDown={handleKeyDown}
        role="region"
      >
        <p>No history recorded for this link.</p>
        {truncatedBefore ? (
          <p className="mt-2 text-xs italic text-gray-400">
            {`History before ${formatDate(truncatedBefore)} isn't recorded.`}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div
      aria-label="Event history for portal link"
      className="mt-2 rounded-md border border-gray-200 bg-white"
      id={regionId}
      onKeyDown={handleKeyDown}
      role="region"
    >
      <ul className="divide-y divide-gray-100">
        {events.map((event) => (
          <li className="flex justify-between gap-3 px-3 py-2" key={event.id}>
            <div>
              <p className="text-xs font-semibold text-neutralDark">
                {getCustomerPortalAccessTokenEventLabel(event)}
              </p>
              <p className="text-xs text-gray-500">{eventDetail(event)}</p>
            </div>
            <p className="shrink-0 text-right text-xs font-semibold text-gray-500">
              {formatDate(event.occurred_at)}
            </p>
          </li>
        ))}
      </ul>
      {truncatedBefore ? (
        <p className="border-t border-gray-100 px-3 py-2 text-xs italic text-gray-400">
          {`History before ${formatDate(truncatedBefore)} isn't recorded.`}
        </p>
      ) : null}
    </div>
  );
}

export function CustomerPortalLinks({
  customerContact,
  customerId,
}: {
  customerContact?: { email: string | null; phone: string | null };
  customerId: string;
}) {
  const tokensQuery = useCustomerPortalAccessTokens(customerId);
  const providerStatus = useCustomerPortalProviderStatus();
  const createToken = useCreateCustomerPortalAccessToken();
  const revokeToken = useRevokeCustomerPortalAccessToken(customerId);
  const sendToken = useSendCustomerPortalAccessToken();
  const tokens = useMemo(() => tokensQuery.data ?? [], [tokensQuery.data]);
  const sortedTokens = useMemo(() => newestFirst(tokens), [tokens]);
  const active = useMemo(() => activeTokens(tokens), [tokens]);
  const hasContact = customerContact
    ? Boolean(customerContact.email || customerContact.phone)
    : true;
  const expiresInputRef = useRef<HTMLInputElement | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelRevokeRef = useRef<HTMLButtonElement | null>(null);
  const revokeButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const historyButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const returnFocusTokenIdRef = useRef<string | null>(null);
  const returnFocusHistoryTokenIdRef = useRef<string | null>(null);
  const [expiresAt, setExpiresAt] = useState("");
  const [latestLink, setLatestLink] = useState<string | null>(null);
  const [latestTokenId, setLatestTokenId] = useState<string | null>(null);
  const [copyUnavailable, setCopyUnavailable] = useState(false);
  const [copyFlash, setCopyFlash] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [sendRequested, setSendRequested] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [freshSendError, setFreshSendError] = useState<string | null>(null);
  const [freshSendingId, setFreshSendingId] = useState<string | null>(null);
  const [freshSendRequestedId, setFreshSendRequestedId] = useState<string | null>(
    null,
  );
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(
    null,
  );

  useEffect(
    () => () => {
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (expandedHistoryId && !sortedTokens.some((token) => token.id === expandedHistoryId)) {
      setExpandedHistoryId(null);
    }
  }, [expandedHistoryId, sortedTokens]);

  useEffect(() => {
    if (confirmingId) {
      cancelRevokeRef.current?.focus();
      return;
    }

    if (returnFocusTokenIdRef.current) {
      revokeButtonRefs.current.get(returnFocusTokenIdRef.current)?.focus();
      returnFocusTokenIdRef.current = null;
    }

    if (returnFocusHistoryTokenIdRef.current) {
      historyButtonRefs.current.get(returnFocusHistoryTokenIdRef.current)?.focus();
      returnFocusHistoryTokenIdRef.current = null;
    }
  }, [confirmingId, expandedHistoryId]);

  function showCopyFlash() {
    setCopyFlash(true);
    if (copyTimerRef.current) {
      clearTimeout(copyTimerRef.current);
    }
    copyTimerRef.current = setTimeout(() => setCopyFlash(false), 1500);
  }

  async function generateLink() {
    setMessage(null);
    setSendError(null);
    setSendRequested(false);
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
    setLatestTokenId(grant.token_id);

    try {
      await copyText(grant.portal_url);
      setMessage("✓ Link copied to clipboard.");
    } catch {
      setCopyUnavailable(true);
    }
  }

  async function sendLatestLink() {
    if (!latestLink || !latestTokenId || !hasContact || !providerReady) {
      return;
    }

    setSendError(null);

    const result = await sendToken
      .mutateAsync({
        customer_id: customerId,
        token_id: latestTokenId,
        portal_url: latestLink,
      })
      .catch(() => null);

    if (!result) {
      setSendError("Couldn't request send. Share the link manually or try again.");
      return;
    }

    setSendRequested(true);
  }

  async function sendNewLink(token: CustomerPortalAccessTokenSummary) {
    if (!hasContact || !providerReady || freshSendingId) {
      return;
    }

    setFreshSendingId(token.id);
    setFreshSendRequestedId(null);
    setFreshSendError(null);
    setSendError(null);
    setSendRequested(false);
    setCopyUnavailable(false);

    const grant = await createToken
      .mutateAsync({
        customer_id: customerId,
        expires_at: token.expires_at,
      })
      .catch(() => null);

    if (!grant) {
      setFreshSendingId(null);
      setFreshSendError("Couldn't generate a new link to send. Try again.");
      return;
    }

    setLatestLink(grant.portal_url);
    setLatestTokenId(grant.token_id);

    try {
      await copyText(grant.portal_url);
      setMessage("✓ Fresh link copied to clipboard.");
    } catch {
      setCopyUnavailable(true);
      setMessage(null);
    }

    const result = await sendToken
      .mutateAsync({
        customer_id: customerId,
        token_id: grant.token_id,
        portal_url: grant.portal_url,
      })
      .catch(() => null);

    setFreshSendingId(null);

    if (!result) {
      setFreshSendError(
        "Couldn't request send. Copy the newly generated link manually or try again.",
      );
      return;
    }

    setSendRequested(true);
    setFreshSendRequestedId(token.id);
  }

  async function copyLatestLink() {
    if (!latestLink) {
      return;
    }

    setMessage(null);
    try {
      await copyText(latestLink);
      setCopyUnavailable(false);
      setMessage("✓ Link copied to clipboard.");
      showCopyFlash();
    } catch {
      setCopyUnavailable(true);
      setMessage(null);
    }
  }

  function resetLatestLink() {
    setLatestLink(null);
    setLatestTokenId(null);
    setCopyUnavailable(false);
    setCopyFlash(false);
    setMessage(null);
    setSendError(null);
    setSendRequested(false);
    expiresInputRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    expiresInputRef.current?.focus();
  }

  const providerReady = providerStatus.data?.provider === "webhook";
  const providerCopy = (() => {
    if (providerStatus.isLoading) {
      return "Checking portal delivery provider...";
    }

    if (providerStatus.error) {
      return "Provider status unavailable. Manual copy remains available.";
    }

    if (providerReady) {
      return "Portal delivery provider ready. Manual copy remains available.";
    }

    return "Portal delivery provider is manual-only. Share links manually.";
  })();

  const sendButton = latestLink ? (
    sendRequested ? (
      <p className="text-xs font-semibold text-accent">✓ Send requested.</p>
    ) : (
      <button
        aria-disabled={!hasContact || !providerReady || sendToken.isPending}
        aria-label="Send portal link via provider"
        className="min-h-9 rounded-md border border-gray-300 px-3 text-sm font-semibold text-neutralDark hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={!hasContact || !providerReady || sendToken.isPending}
        onClick={() => void sendLatestLink()}
        title={
          !hasContact
            ? "No contact saved — share the link manually"
            : !providerReady
              ? "Portal delivery provider is manual-only — share the link manually"
              : undefined
        }
        type="button"
      >
        {sendToken.isPending ? "Sending..." : "Send link"}
      </button>
    )
  ) : null;

  function cancelRevokeConfirmation(tokenId?: string) {
    returnFocusTokenIdRef.current = tokenId ?? null;
    setConfirmingId(null);
  }

  function confirmRevoke(tokenId: string) {
    setConfirmingId(null);
    setRevokingId(tokenId);
    revokeToken.mutate(tokenId, {
      onSettled: () => setRevokingId(null),
    });
  }

  function collapseHistory(tokenId: string) {
    returnFocusHistoryTokenIdRef.current = tokenId;
    setExpandedHistoryId(null);
  }

  function handleConfirmKeyDown(
    event: KeyboardEvent<HTMLDivElement>,
    tokenId: string,
  ) {
    if (event.key !== "Escape") {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    cancelRevokeConfirmation(tokenId);
  }

  const readinessCard = (() => {
    if (tokensQuery.isLoading) {
      return {
        body: null,
        label: "Loading portal status…",
        tone: "border-l-gray-300",
      };
    }

    if (tokensQuery.error) {
      return {
        body: "Use retry to reload portal access history.",
        label: "Couldn't load portal links.",
        tone: "border-l-red-500",
      };
    }

    if (tokens.length === 0) {
      if (!hasContact) {
        return {
          body: "This customer has no email or phone on file. Share the link manually.",
          label: "No contact saved",
          tone: "border-l-gray-300",
        };
      }

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
        body: "A portal link was shared but hasn't been opened.",
        label: "Shared — not yet opened",
        tone: "border-l-amber-400",
      };
    }

    if (!hasContact) {
      return {
        body: "This customer has no email or phone on file. Share the link manually.",
        label: "No contact saved",
        tone: "border-l-gray-300",
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
      <div>
        <h3 className="text-sm font-semibold text-neutralDark">Portal access</h3>
        <p className="mt-1 text-xs text-gray-500">
          Generate links to share with this customer.
        </p>
      </div>

      <div
        className={`mt-3 rounded-md border border-l-4 border-gray-200 bg-white p-3 text-sm ${readinessCard.tone}`}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-semibold text-neutralDark">{readinessCard.label}</p>
            {readinessCard.body ? (
              <p className="mt-0.5 text-xs text-gray-600">{readinessCard.body}</p>
            ) : null}
            <p className="mt-1 text-xs font-medium text-gray-500">
              {providerCopy}
            </p>
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

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="flex flex-col gap-1 text-xs font-semibold text-gray-600">
          Expires
          <input
            className="min-h-10 rounded-md border border-gray-300 px-3 text-sm font-normal text-neutralDark outline-none focus:border-primary"
            disabled={createToken.isPending}
            onChange={(event) => setExpiresAt(event.target.value)}
            ref={expiresInputRef}
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
        {createToken.error ? (
          <p className="text-xs font-semibold text-red-700">
            {"Couldn't generate portal link. Try again."}
          </p>
        ) : null}
      </div>

      {latestLink ? (
        <div className="mt-3 rounded-md border border-gray-200 bg-gray-50 p-3">
          {copyUnavailable ? (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold text-neutralDark">
                Link ready — copy it manually:
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
                  {copyFlash ? "Copied!" : "Copy"}
                </button>
              </div>
              <p className="text-xs text-gray-500">
                Paste this into an email or text to share with the customer.
              </p>
              <div>{sendButton}</div>
            </div>
          ) : (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-1">
                <p className="text-xs font-semibold text-accent">
                  {message ?? "✓ Link copied to clipboard."}
                </p>
                {sendRequested ? sendButton : null}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  className="min-h-9 rounded-md border border-gray-300 px-3 text-sm font-semibold text-neutralDark hover:bg-gray-50"
                  onClick={() => void copyLatestLink()}
                  type="button"
                >
                  {copyFlash ? "Copied!" : "Copy again"}
                </button>
                {sendRequested ? null : sendButton}
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
          {sendError ? (
            <p className="mt-2 text-xs font-semibold text-red-700" role="alert">
              {sendError}
            </p>
          ) : null}
          <p className="mt-2 text-xs italic text-gray-400">
            {
              "This link is only available during this session. Reload the page and it's gone — generate a new one to reshare."
            }
          </p>
        </div>
      ) : null}

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
              const isRevoking =
                revokingId === token.id ||
                (revokeToken.isPending && revokingId === null);
              const isConfirming = confirmingId === token.id;
              const isHistoryExpanded = expandedHistoryId === token.id;
              const historyRegionId = `portal-token-history-${token.id}`;

              return (
                <div className="px-3 py-2" key={token.id}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="min-w-0 text-xs font-semibold text-neutralDark">
                      <span
                        className={`mr-2 inline-block h-1.5 w-1.5 rounded-full align-middle ${
                          isActive ? "bg-emerald-600" : "bg-gray-400"
                        }`}
                      />
                      {tokenRowLabel(token)}
                    </p>
                    <p className="shrink-0 text-right text-xs font-semibold text-gray-500">
                      Created {formatDate(token.created_at)}
                    </p>
                  </div>
                  <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-gray-500">
                      {tokenExpiryText(token)} · {formatOpened(token.last_used_at)}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        aria-controls={historyRegionId}
                        aria-expanded={isHistoryExpanded}
                        className="min-h-9 rounded-md border border-gray-300 px-3 text-xs font-semibold text-neutralDark hover:bg-gray-50"
                        onClick={() =>
                          setExpandedHistoryId((current) =>
                            current === token.id ? null : token.id,
                          )
                        }
                        ref={(node) => {
                          if (node) {
                            historyButtonRefs.current.set(token.id, node);
                          } else {
                            historyButtonRefs.current.delete(token.id);
                          }
                        }}
                        type="button"
                      >
                        {isHistoryExpanded ? "Hide history" : "History"}
                      </button>
                      {isActive ? (
                        <>
                          {freshSendingId === token.id ? (
                            <button
                              className="min-h-9 rounded-md border border-gray-300 px-3 text-xs font-semibold text-neutralDark disabled:cursor-not-allowed disabled:opacity-60"
                              disabled
                              type="button"
                            >
                              Sending new...
                            </button>
                          ) : freshSendRequestedId === token.id ? null : (
                            <button
                              aria-label={`Send new portal link for link created ${formatDate(token.created_at)}`}
                              className="min-h-9 rounded-md border border-gray-300 px-3 text-xs font-semibold text-neutralDark hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                              disabled={!hasContact || !providerReady || Boolean(freshSendingId)}
                              onClick={() => void sendNewLink(token)}
                              title={
                                !hasContact
                                  ? "No contact saved — share the link manually"
                                  : !providerReady
                                    ? "Portal delivery provider is manual-only — share links manually"
                                    : undefined
                              }
                              type="button"
                            >
                              Send new link
                            </button>
                          )}
                          {isRevoking ? (
                          <button
                            className="min-h-9 rounded-md border border-red-200 px-3 text-xs font-semibold text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                            disabled
                            type="button"
                          >
                            Revoking...
                          </button>
                        ) : isConfirming ? null : (
                          <button
                            aria-label={`Revoke portal link created ${formatDate(token.created_at)}`}
                            className="min-h-9 rounded-md border border-red-200 px-3 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                            onClick={() => setConfirmingId(token.id)}
                            ref={(node) => {
                              if (node) {
                                revokeButtonRefs.current.set(token.id, node);
                              } else {
                                revokeButtonRefs.current.delete(token.id);
                              }
                            }}
                            type="button"
                          >
                            Revoke
                          </button>
                          )}
                        </>
                      ) : null}
                    </div>
                  </div>
                  {freshSendRequestedId === token.id ? (
                    <p className="mt-2 text-xs font-semibold text-accent">
                      ✓ Send requested with a new link.
                    </p>
                  ) : null}
                  {isHistoryExpanded ? (
                    <CustomerPortalTokenHistory
                      onCollapse={() => collapseHistory(token.id)}
                      regionId={historyRegionId}
                      tokenId={token.id}
                    />
                  ) : null}
                  {isActive && isConfirming ? (
                    <div
                      aria-label={`Confirm revoke for ${tokenRowLabel(token)}`}
                      className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2"
                      onKeyDown={(event) => handleConfirmKeyDown(event, token.id)}
                      role="group"
                    >
                      <p className="text-xs font-semibold text-neutralDark">
                        Revoke this link?
                      </p>
                      <p className="mt-0.5 text-xs text-gray-600">
                        {revokeConfirmPrompt(token)}
                      </p>
                      <div className="mt-2 flex justify-end gap-2">
                        <button
                          aria-label="Cancel revoke"
                          className="min-h-8 rounded-md border border-gray-300 px-3 text-xs font-semibold text-neutralDark hover:bg-gray-50"
                          onClick={() => cancelRevokeConfirmation(token.id)}
                          ref={cancelRevokeRef}
                          type="button"
                        >
                          Cancel
                        </button>
                        <button
                          className="min-h-8 rounded-md bg-red-700 px-3 text-xs font-semibold text-white hover:bg-red-800"
                          onClick={() => confirmRevoke(token.id)}
                          type="button"
                        >
                          Confirm revoke
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
      {freshSendError ? (
        <p className="mt-2 text-xs font-semibold text-red-700" role="alert">
          {freshSendError}
        </p>
      ) : null}
      {revokeToken.error ? (
        <p className="mt-2 text-xs font-semibold text-red-700">
          {"Couldn't revoke link. Try again."}
        </p>
      ) : null}
    </section>
  );
}
