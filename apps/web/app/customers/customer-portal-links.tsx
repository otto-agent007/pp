"use client";

import {
  getCustomerPortalAccessTokenEventLabel,
  getCustomerPortalAccessTokenLabel,
  getCustomerPortalAccessTokenState,
  getCustomerPortalHandoffReview,
  getProviderReadinessCopy,
  type CustomerLedgerSummary,
} from "@pest-patrol/domain";
import {
  Button,
  Card,
  Eyebrow,
  StatusPill,
  buttonClassName,
  type StatusPillTone,
} from "@pest-patrol/ui";
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

function formatRelativeAge(value: string) {
  const timestamp = new Date(value).getTime();
  const now = Date.now();

  if (Number.isNaN(timestamp)) {
    return null;
  }

  const diffMs = Math.max(0, now - timestamp);
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) {
    return "just now";
  }

  if (diffMinutes < 60) {
    return `${diffMinutes} ${diffMinutes === 1 ? "minute" : "minutes"} ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours < 24) {
    return `${diffHours} ${diffHours === 1 ? "hour" : "hours"} ago`;
  }

  const diffDays = Math.floor(diffHours / 24);

  return `${diffDays} ${diffDays === 1 ? "day" : "days"} ago`;
}

function formatAccessTimestamp(value: string | null) {
  if (!value) {
    return "Never opened";
  }

  const timestamp = new Date(value);

  if (Number.isNaN(timestamp.getTime())) {
    return "Unknown open time";
  }

  const absolute = new Intl.DateTimeFormat("en", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    timeZone: "America/Los_Angeles",
    timeZoneName: "short",
    year: "numeric",
  }).format(timestamp);
  const relative = formatRelativeAge(value);

  return relative ? `${absolute} (${relative})` : absolute;
}

function formatOpened(value: string | null) {
  return value ? `Opened ${formatAccessTimestamp(value)}` : "Never opened";
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
  return tokens.filter(
    (token) => getCustomerPortalAccessTokenState(token) === "active",
  );
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

function tokenStateTone(
  token: CustomerPortalAccessTokenSummary,
): StatusPillTone {
  const state = getCustomerPortalAccessTokenState(token);

  if (state === "active") {
    return token.last_used_at ? "success" : "warning";
  }

  if (state === "expired") {
    return "neutral";
  }

  return "danger";
}

type PortalReadinessCard = {
  body: string | null;
  label: string;
  tone: StatusPillTone;
};

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

  return `This link is active and expires ${formatDate(token.expires_at)}. The customer last opened it ${formatAccessTimestamp(token.last_used_at)}.`;
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
      <Card
        aria-label="Event history for portal link"
        className="mt-2 text-xs font-semibold text-theme-text-muted shadow-none"
        id={regionId}
        onKeyDown={handleKeyDown}
        padding="sm"
        role="region"
      >
        Loading history...
      </Card>
    );
  }

  if (eventsQuery.error) {
    return (
      <Card
        aria-label="Event history for portal link"
        className="mt-2 border-status-alert-danger-border shadow-none"
        id={regionId}
        onKeyDown={handleKeyDown}
        padding="sm"
        role="region"
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold text-status-alert-danger-fg">
            {"Couldn't load portal history."}
          </p>
          <Button
            onClick={() => void eventsQuery.refetch()}
            size="sm"
            variant="ghost"
          >
            Retry
          </Button>
        </div>
      </Card>
    );
  }

  if (events.length === 0) {
    return (
      <Card
        aria-label="Event history for portal link"
        className="mt-2 text-xs text-theme-text-muted shadow-none"
        id={regionId}
        onKeyDown={handleKeyDown}
        padding="sm"
        role="region"
      >
        <p>No history recorded for this link.</p>
        {truncatedBefore ? (
          <p className="mt-2 text-xs italic text-theme-text-muted/70">
            {`History before ${formatDate(truncatedBefore)} isn't recorded.`}
          </p>
        ) : null}
      </Card>
    );
  }

  return (
    <Card
      aria-label="Event history for portal link"
      className="mt-2 shadow-none"
      id={regionId}
      onKeyDown={handleKeyDown}
      padding="none"
      role="region"
    >
      <ul className="divide-y divide-primitive-slate-100">
        {events.map((event) => (
          <li className="flex justify-between gap-3 px-3 py-2" key={event.id}>
            <div>
              <p className="text-xs font-semibold text-neutralDark">
                {getCustomerPortalAccessTokenEventLabel(event)}
              </p>
              <p className="text-xs text-theme-text-muted">
                {eventDetail(event)}
              </p>
            </div>
            <p className="shrink-0 text-right text-xs font-semibold text-theme-text-muted">
              {formatAccessTimestamp(event.occurred_at)}
            </p>
          </li>
        ))}
      </ul>
      {truncatedBefore ? (
        <p className="border-t border-primitive-slate-100 px-3 py-2 text-xs italic text-theme-text-muted/70">
          {`History before ${formatDate(truncatedBefore)} isn't recorded.`}
        </p>
      ) : null}
    </Card>
  );
}

export function CustomerPortalLinks({
  accountSummary,
  customerContact,
  customerId,
}: {
  accountSummary?: CustomerLedgerSummary;
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
  const portalHandoff = accountSummary
    ? getCustomerPortalHandoffReview({
        hasActivePortalLink: active.length > 0,
        hasContact,
        ledgerSummary: accountSummary,
        providerConfigured: Boolean(providerStatus.data?.webhook_configured),
      })
    : null;
  const expiresInputRef = useRef<HTMLInputElement | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyAgainRef = useRef<HTMLButtonElement | null>(null);
  const focusCopyAgainAfterSendRef = useRef(false);
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
  const [freshSendErrorId, setFreshSendErrorId] = useState<string | null>(null);
  const [freshSendingId, setFreshSendingId] = useState<string | null>(null);
  const [freshSendRequestedId, setFreshSendRequestedId] = useState<
    string | null
  >(null);
  const [freshManualLink, setFreshManualLink] = useState<{
    copied: boolean;
    portalUrl: string;
    tokenId: string;
  } | null>(null);
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
    if (
      expandedHistoryId &&
      !sortedTokens.some((token) => token.id === expandedHistoryId)
    ) {
      setExpandedHistoryId(null);
    }
  }, [expandedHistoryId, sortedTokens]);

  useEffect(() => {
    if (sendRequested && focusCopyAgainAfterSendRef.current) {
      copyAgainRef.current?.focus();
      focusCopyAgainAfterSendRef.current = false;
    }
  }, [sendRequested]);

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
      historyButtonRefs.current
        .get(returnFocusHistoryTokenIdRef.current)
        ?.focus();
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
    setFreshManualLink(null);
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
      setSendError(
        "Couldn't request send. Share the link manually or try again.",
      );
      return;
    }

    focusCopyAgainAfterSendRef.current = true;
    setSendRequested(true);
  }

  async function sendNewLink(token: CustomerPortalAccessTokenSummary) {
    if (!hasContact || !providerReady || freshSendingId) {
      return;
    }

    setFreshSendingId(token.id);
    setFreshSendRequestedId(null);
    setFreshSendError(null);
    setFreshSendErrorId(null);
    setFreshManualLink(null);
    setSendError(null);

    const grant = await createToken
      .mutateAsync({
        customer_id: customerId,
        expires_at: token.expires_at,
      })
      .catch(() => null);

    if (!grant) {
      setFreshSendingId(null);
      setFreshSendError("Couldn't generate a new link to send. Try again.");
      setFreshSendErrorId(token.id);
      return;
    }

    let copied = false;
    try {
      await copyText(grant.portal_url);
      copied = true;
    } catch {
      copied = false;
    }
    setFreshManualLink({
      copied,
      portalUrl: grant.portal_url,
      tokenId: token.id,
    });

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
      setFreshSendErrorId(token.id);
      return;
    }

    setFreshSendRequestedId(token.id);
    setFreshSendErrorId(null);
  }

  async function copyFreshManualLink() {
    if (!freshManualLink) {
      return;
    }

    try {
      await copyText(freshManualLink.portalUrl);
      setFreshManualLink({
        ...freshManualLink,
        copied: true,
      });
    } catch {
      setFreshManualLink({
        ...freshManualLink,
        copied: false,
      });
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
    setFreshManualLink(null);
    expiresInputRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
    expiresInputRef.current?.focus();
  }

  const providerReady = providerStatus.data?.provider === "webhook";
  const providerReadinessCopy = getProviderReadinessCopy(
    "portal",
    providerStatus.data,
  );
  const providerCopy = (() => {
    if (providerStatus.isLoading) {
      return "Checking portal delivery provider…";
    }

    if (providerStatus.error) {
      return "Provider status unavailable. Manual copy remains available.";
    }

    if (providerReady) {
      return null;
    }

    return providerReadinessCopy.detail;
  })();
  const showProviderCopy = Boolean(providerCopy);

  const sendButton =
    latestLink && providerReady ? (
      sendRequested ? (
        <StatusPill tone="success">✓ Send requested.</StatusPill>
      ) : (
        <Button
          aria-busy={sendToken.isPending}
          aria-disabled={!hasContact || sendToken.isPending}
          aria-label="Send portal link via provider"
          disabled={!hasContact || sendToken.isPending}
          onClick={() => void sendLatestLink()}
          size="sm"
          title={
            !hasContact
              ? "No contact saved — share the link manually"
              : undefined
          }
          variant="ghost"
        >
          {sendToken.isPending ? "Sending…" : "Send link ▶"}
        </Button>
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

  const readinessCard: PortalReadinessCard = (() => {
    if (tokensQuery.isLoading) {
      return {
        body: null,
        label: "Loading portal status…",
        tone: "neutral",
      };
    }

    if (tokensQuery.error) {
      return {
        body: "Use retry to reload portal access history.",
        label: "Couldn't load portal links.",
        tone: "danger",
      };
    }

    if (tokens.length === 0) {
      if (!hasContact) {
        return {
          body: "This customer has no email or phone on file. Share the link manually.",
          label: "No contact saved",
          tone: "warning",
        };
      }

      return {
        body: "Generate a link to share the customer portal.",
        label: "No portal links",
        tone: "neutral",
      };
    }

    if (active.length > 1) {
      return {
        body: "Consider revoking older links before sharing again.",
        label: `${active.length} active links`,
        tone: "warning",
      };
    }

    if (active.length === 1) {
      const openedAt = latestOpenedAt(active);

      if (openedAt) {
        return {
          body: `Last opened ${formatAccessTimestamp(openedAt)}.`,
          label: "Customer has accessed the portal",
          tone: "success",
        };
      }

      return {
        body: "A portal link was shared but hasn't been opened.",
        label: "Shared — not yet opened",
        tone: "warning",
      };
    }

    if (!hasContact) {
      return {
        body: "This customer has no email or phone on file. Share the link manually.",
        label: "No contact saved",
        tone: "warning",
      };
    }

    return {
      body: "All previous links are expired or revoked.",
      label: "No active links",
      tone: "neutral",
    };
  })();

  return (
    <section className="mt-4 border-t border-primitive-slate-100 pt-4">
      <div>
        <Eyebrow tone="accent">Portal access</Eyebrow>
        <p className="mt-1 text-xs text-theme-text-muted">
          Generate links to share with this customer.
        </p>
      </div>

      {portalHandoff ? (
        <Card className="mt-3 text-sm shadow-none" padding="sm" tone="subtle">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Eyebrow>Portal handoff review</Eyebrow>
              <p className="mt-1 font-semibold text-neutralDark">
                {portalHandoff.label}
              </p>
              <p className="mt-1 text-xs text-theme-text-secondary">
                {portalHandoff.summary}
              </p>
            </div>
            <StatusPill
              dot={false}
              tone={providerReady ? "success" : "neutral"}
            >
              {portalHandoff.mode_label}
            </StatusPill>
          </div>
        </Card>
      ) : null}

      <Card className="mt-3 text-sm shadow-none" padding="sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <StatusPill tone={readinessCard.tone}>
              {readinessCard.label}
            </StatusPill>
            {readinessCard.body ? (
              <p className="mt-0.5 text-xs text-theme-text-secondary">
                {readinessCard.body}
              </p>
            ) : null}
            {showProviderCopy ? (
              <p className="mt-1 text-xs font-medium text-theme-text-muted/70">
                {providerCopy}
              </p>
            ) : null}
          </div>
          {tokensQuery.error ? (
            <Button
              onClick={() => void tokensQuery.refetch()}
              size="sm"
              variant="ghost"
            >
              Retry
            </Button>
          ) : null}
        </div>
      </Card>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="flex flex-col gap-1 text-xs font-semibold text-theme-text-secondary">
          Expires
          <input
            className="min-h-10 rounded-md border border-theme-border-default bg-theme-background-surface px-3 text-sm font-normal text-neutralDark outline-none focus:border-theme-action-primary"
            disabled={createToken.isPending}
            onChange={(event) => setExpiresAt(event.target.value)}
            ref={expiresInputRef}
            type="date"
            value={expiresAt}
          />
        </label>
        <Button
          disabled={createToken.isPending}
          onClick={() => void generateLink()}
        >
          {createToken.isPending ? "Generating…" : "Generate link"}
        </Button>
        {createToken.error ? (
          <p className="text-xs font-semibold text-status-alert-danger-fg">
            {"Couldn't generate portal link. Try again."}
          </p>
        ) : null}
      </div>

      {latestLink ? (
        <Card className="mt-3 shadow-none" padding="sm" tone="subtle">
          {copyUnavailable ? (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold text-neutralDark">
                Link ready — copy it manually:
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  className="min-h-10 flex-1 rounded-md border border-theme-border-default bg-theme-background-surface px-3 font-mono text-xs text-neutralDark outline-none focus:border-theme-action-primary"
                  onFocus={(event) => event.currentTarget.select()}
                  readOnly
                  value={latestLink}
                />
                <Button onClick={() => void copyLatestLink()} variant="ghost">
                  {copyFlash ? "Copied!" : "Copy"}
                </Button>
              </div>
              <p className="text-xs text-theme-text-muted">
                Paste this into an email or text to share with the customer.
              </p>
              <div className="mt-1">{sendButton}</div>
            </div>
          ) : (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-1">
                <StatusPill tone="success">
                  {message ?? "✓ Link copied to clipboard."}
                </StatusPill>
                {sendRequested ? sendButton : null}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  className={buttonClassName({ size: "sm", variant: "ghost" })}
                  onClick={() => void copyLatestLink()}
                  ref={copyAgainRef}
                  type="button"
                >
                  {copyFlash ? "Copied!" : "Copy again"}
                </button>
                {sendRequested ? null : sendButton}
                <Button onClick={resetLatestLink} size="sm" variant="text">
                  Generate new
                </Button>
              </div>
            </div>
          )}
          {sendError ? (
            <p
              className="mt-2 text-xs font-semibold text-status-alert-danger-fg"
              role="alert"
            >
              {sendError}
            </p>
          ) : null}
          <p className="mt-2 text-xs italic text-theme-text-muted/70">
            {
              "This link is only available during this session. Reload the page and it's gone — generate a new one to reshare."
            }
          </p>
        </Card>
      ) : null}

      <div className="mt-3 flex flex-col gap-2">
        {tokensQuery.isLoading ? (
          <>
            <div
              className="h-12 animate-pulse rounded bg-primitive-slate-100"
              data-testid="portal-link-skeleton"
            />
            <div
              className="h-12 animate-pulse rounded bg-primitive-slate-100"
              data-testid="portal-link-skeleton"
            />
          </>
        ) : tokensQuery.error || tokens.length === 0 ? null : (
          <Card
            className="divide-y divide-primitive-slate-100 shadow-none"
            padding="none"
            tone="subtle"
          >
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
                    <StatusPill tone={tokenStateTone(token)}>
                      {tokenRowLabel(token)}
                    </StatusPill>
                    <p className="shrink-0 text-right text-xs font-semibold text-theme-text-muted">
                      Created {formatDate(token.created_at)}
                    </p>
                  </div>
                  <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-theme-text-muted">
                      {tokenExpiryText(token)} ·{" "}
                      {formatOpened(token.last_used_at)}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        aria-controls={historyRegionId}
                        aria-expanded={isHistoryExpanded}
                        className={buttonClassName({
                          size: "sm",
                          variant: "ghost",
                        })}
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
                            <Button
                              aria-busy="true"
                              disabled
                              size="sm"
                              variant="ghost"
                            >
                              Sending new…
                            </Button>
                          ) : freshSendRequestedId === token.id ||
                            !providerReady ? null : (
                            <Button
                              aria-label={`Send new portal link for link created ${formatDate(token.created_at)}`}
                              disabled={!hasContact || Boolean(freshSendingId)}
                              onClick={() => void sendNewLink(token)}
                              size="sm"
                              title={
                                !hasContact
                                  ? "No contact saved — share the link manually"
                                  : undefined
                              }
                              variant="ghost"
                            >
                              Send new link
                            </Button>
                          )}
                          {isRevoking ? (
                            <button
                              className={buttonClassName({
                                className:
                                  "border-status-alert-danger-border text-status-alert-danger-fg",
                                size: "sm",
                                variant: "ghost",
                              })}
                              disabled
                              type="button"
                            >
                              Revoking…
                            </button>
                          ) : isConfirming ? null : (
                            <button
                              aria-label={`Revoke portal link created ${formatDate(token.created_at)}`}
                              className={buttonClassName({
                                className:
                                  "border-status-alert-danger-border text-status-alert-danger-fg hover:bg-status-alert-danger-bg",
                                size: "sm",
                                variant: "ghost",
                              })}
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
                    <StatusPill className="mt-2" tone="success">
                      ✓ Send requested for the fresh link.
                    </StatusPill>
                  ) : null}
                  {freshManualLink?.tokenId === token.id ? (
                    <Card className="mt-2 shadow-none" padding="sm">
                      <p className="text-xs font-semibold text-neutralDark">
                        Fresh active link created. Older active links remain
                        available until revoked.
                      </p>
                      {freshManualLink.copied ? (
                        <StatusPill className="mt-1" tone="success">
                          ✓ Fresh link copied to clipboard.
                        </StatusPill>
                      ) : (
                        <p className="mt-1 text-xs text-theme-text-muted">
                          Copy the fresh link manually:
                        </p>
                      )}
                      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                        <input
                          className="min-h-9 flex-1 rounded-md border border-theme-border-default bg-theme-background-surface px-3 font-mono text-xs text-neutralDark outline-none focus:border-theme-action-primary"
                          onFocus={(event) => event.currentTarget.select()}
                          readOnly
                          value={freshManualLink.portalUrl}
                        />
                        <Button
                          onClick={() => void copyFreshManualLink()}
                          size="sm"
                          variant="ghost"
                        >
                          Copy fresh link
                        </Button>
                      </div>
                    </Card>
                  ) : null}
                  {freshSendError && freshSendErrorId === token.id ? (
                    <p
                      className="mt-2 text-xs font-semibold text-status-alert-danger-fg"
                      role="alert"
                    >
                      {freshSendError}
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
                    <Card
                      aria-label={`Confirm revoke for ${tokenRowLabel(token)}`}
                      className="mt-2 border-status-alert-warning-border bg-status-alert-warning-bg shadow-none"
                      onKeyDown={(event) =>
                        handleConfirmKeyDown(event, token.id)
                      }
                      padding="sm"
                      role="group"
                    >
                      <p className="text-xs font-semibold text-neutralDark">
                        Revoke this link?
                      </p>
                      <p className="mt-0.5 text-xs text-theme-text-secondary">
                        {revokeConfirmPrompt(token)}
                      </p>
                      <div className="mt-2 flex justify-end gap-2">
                        <button
                          aria-label="Cancel revoke"
                          className={buttonClassName({
                            size: "sm",
                            variant: "ghost",
                          })}
                          onClick={() => cancelRevokeConfirmation(token.id)}
                          ref={cancelRevokeRef}
                          type="button"
                        >
                          Cancel
                        </button>
                        <Button
                          onClick={() => confirmRevoke(token.id)}
                          size="sm"
                          variant="danger"
                        >
                          Confirm revoke
                        </Button>
                      </div>
                    </Card>
                  ) : null}
                </div>
              );
            })}
          </Card>
        )}
      </div>
      {revokeToken.error ? (
        <p className="mt-2 text-xs font-semibold text-status-alert-danger-fg">
          {"Couldn't revoke link. Try again."}
        </p>
      ) : null}
    </section>
  );
}
