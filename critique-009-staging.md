# Critique: Portal Send/Resend Provider Boundary V1 (post-implementation)

Reviewed: git log unavailable at time of review (bash workspace failed to start). Implementation lives in `apps/web/app/customers/customer-portal-links.tsx`, `apps/web/hooks/useCustomerPortalAccess.ts`, `apps/web/app/api/portal/access-tokens/send/route.ts`, `apps/web/app/api/portal/access-tokens/provider-status/route.ts`, `packages/api-client/portal.ts`, `packages/domain/closeouts.ts`, `packages/types/index.ts`.

## What's correct against the proposal

- Three-zone structure preserved from prior slices: share readiness card → generate + share action area → token audit list.
- `providerReady` signal is server-fetched via `useCustomerPortalProviderStatus` → `GET /api/portal/access-tokens/provider-status`, which returns `provider: "webhook"` when `PORTAL_DELIVERY_WEBHOOK_URL` is set and `"manual"` otherwise. This matches the codex-review's guidance to treat `providerSendEnabled` as a server-derived config, not a UI-only toggle.
- Architecture is correct throughout: hook → domain → `packages/api-client` → route. No direct Supabase calls from `CustomerPortalLinks`.
- `CustomerPortalSendInput`, `CustomerPortalSendResult`, `CustomerPortalProviderStatus`, and `CustomerPortalSendProviderPayload` are all in `packages/types` per AGENTS rules.
- `sendCustomerPortalAccessToken` lives in `packages/domain/closeouts.ts` (wraps `sendCustomerPortalAccessTokenRecord` from api-client). Business logic in shared packages, not in the component.
- `[Send link]` button appears in the post-generation zone with `aria-label="Send portal link via provider"` — distinguishable from copy action for screen readers.
- `disabled` when `!hasContact || !providerReady` with matching `title` tooltip ("No contact saved — share the link manually" / "Portal delivery provider is manual-only — share the link manually"). Both `disabled` and `aria-disabled` are set.
- `✓ Send requested.` text replaces `[Send link]` after a successful send. Send button is absent, not hidden behind a stale label.
- `sendError` renders with `role="alert"` — announced immediately to screen readers on appearance.
- `[Copy again]` and `[Generate new]` remain enabled during send in-flight state. Manual fallback is never blocked.
- `resetLatestLink` now calls `expiresInputRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })` and `expiresInputRef.current?.focus()` — fixes the scroll gap flagged in the slice 002 critique.
- `copyFlash` timer (`setTimeout 1500 ms → clearTimeout on unmount`) correctly powers the `Copy again` → `Copied!` flash — also a slice 002 fix.
- Route validates: admin auth, token ownership (`customer_id` match), active/non-expired status, URL origin matches this app, URL path matches the customer, raw access token hash matches stored hash. No token hash is exposed in any response body.
- Route sends a sanitized `CustomerPortalSendProviderPayload` — only `{ customer_id, token_id, portal_url }` and `{ id, name, email, phone }`. No `token_hash`, no internal IDs, no service-role metadata.
- Route test confirms the provider secret is sent as `Authorization: Bearer …` and does NOT appear in any response to the admin client.
- `send_requested` and `send_failed` event kinds added to `CustomerPortalAccessEventKind` in types. `getCustomerPortalAccessTokenEventLabel` returns correct labels ("Send requested", "Send failed").
- "Send new link" per-row action (`sendNewLink`) generates a fresh token then immediately sends it, correctly resolving the session-only raw-URL constraint: you cannot resend an existing token because its raw URL is only in React state at generation time.
- `freshSendingId` guards parallel per-row sends: only one in-flight at a time (`disabled={Boolean(freshSendingId)}`).
- `freshSendRequestedId` correctly hides the "Send new link" button for the row that just succeeded and shows `✓ Send requested with a new link.` — only that row's button disappears; others remain active.
- No customer email, phone, or delivery channel surfaced in the UI. Contact state drives `hasContact` boolean only.
- Session notice has its contraction restored: `"it's gone"` — matches proposal copy bank.
- Route test covers: missing auth, unconfigured webhook (503), bad customer/URL match, revoked token, hash mismatch, missing contact, successful send with sanitized payload, and provider failure with no provider-internal leakage.

## Visual / copy issues

1. **`providerCopy` line inserted into the readiness card unconditionally (line 618–621).** The readiness card was designed to communicate portal token state only. A third line of provider health text (`"Portal delivery provider ready. Manual copy remains available."` / `"Checking portal delivery provider..."` / `"Provider status unavailable. Manual copy remains available."` / `"Portal delivery provider is manual-only. Share links manually."`) now appears in EVERY card state — including when the card body already dominates with "Customer has accessed the portal," "2 active links," etc. The effect: a customer who has accessed the portal shows a success card followed immediately by a neutral provider line that dilutes the signal. Fix: gate `providerCopy` to show only when `providerReady = false` (the only case where ops need to know they can't send), and only when no dominant active-link state is present. When the provider is ready and a token exists, the disabled/enabled state of the send buttons is sufficient feedback.

2. **`[Send link ▶]` chevron absent.** Proposal copy bank and wireframes used `[Send link ▶]` for the post-generation button and `[Resend]` for the row button. Implementation renders `Send link` and `Send new link` (no chevron). Minor — single-character add — but the chevron signals a secondary action in the button row and distinguishes it from `[Copy again]`.

3. **"Send new link" row button label diverges from proposal copy bank.** Proposal specified `Resend` / `Sending…` for the token row. Implementation uses `Send new link` / `Sending new...`. The behavioral reason is correct (generates a new token, not a bare resend), and the new label is more honest. But `Sending new...` uses three ASCII periods where the rest of the component uses `…` (Unicode). Consistency fix: `Sending new…` or consolidate to `Sending…`.

4. **`✓ Send requested with a new link.` — copy deviates from the proposal's `✓ Send requested.`** The suffix " with a new link" is informative but adds length. Proposal's copy bank used `✓ Send requested.` uniformly for both the post-generation zone and the token row success signal. Using the same string keeps the copy bank consistent and avoids introducing a second variant for the same semantic outcome.

## Interaction / state issues

5. **Send controls rendered (disabled) when `providerReady = false`, contradicting the proposal's "hidden" intent.** The proposal was explicit: "Two targeted additions that are **rendered only when** a future `providerSendEnabled` signal is present" and "Hidden (not just disabled) until the route exists." The implementation renders `[Send link]` disabled when `!providerReady`, and renders "Send new link" disabled on every active token row regardless of provider status. In the manual-only state, every token row now carries a permanently disabled "Send new link" button alongside "History" and "Revoke." This adds visual noise for an action that is not available. The codex-review left hidden-vs-disabled for Codex to decide; this critique recommends hidden because it matches the proposal intent and cleans up the token row density.

6. **`freshSendError` renders below the full token list, not below the affected row.** The proposal called for the error to appear inline below the affected row, consistent with existing revoke-error placement. `freshSendError` (line 902–906) is rendered outside the `sortedTokens.map()` loop entirely, at component bottom. If multiple tokens are visible, the error appears below all of them with no visual connection to which row triggered it. Fix: move `freshSendError` rendering inside the token row block for the affected `token.id`, below the buttons line, using the same `text-xs font-semibold text-red-700 role="alert"` pattern as `sendError`.

7. **No `aria-busy="true"` on in-flight send buttons.** Proposal accessibility item 4 specified `aria-busy="true"` on the button while `[Sending…]` / `[Sending new...]` is active, so assistive technology announces the in-progress state without requiring a live region. Neither the post-generation `[Send link]` nor the per-row "Send new link" button sets `aria-busy` during `isPending` / `freshSendingId === token.id`. Fix: add `aria-busy={sendToken.isPending}` to the post-generation button and `aria-busy={freshSendingId === token.id}` to the row button when in-flight.

8. **No distinction between provider-blocked and retryable failure in the UI.** The proposal defined separate copy for "provider blocked" (`[Send link]` disabled, `"Provider blocked this send. Share the link manually."`) vs. transient failure (`[Send link]` re-enables, `"Couldn't request send. Share the link manually or try again."`). The route distinguishes these via status codes (503 for unconfigured, 502 for provider failure), but `sendLatestLink` and `sendNewLink` both catch errors with `.catch(() => null)` — any non-2xx result resolves to null and shows the same generic string. Two options: (a) read the response status from the mutation error to branch between `sendError` strings, or (b) accept one generic error string for V1 and treat the blocked/failed distinction as a follow-up. Option (b) is acceptable given that `providerReady = false` already prevents the disabled-but-visible send from being triggered; the blocked path requires an active webhook that subsequently refuses. Tag for the next provider slice.

## Scope drift

9. **`send_requested` and `send_failed` events are now persisted AND surfaced in the history drawer.** The proposal stated clearly: "The history drawer shows only server-persisted lifecycle events. 'Send requested' never appears inside the drawer in V1." But the implementation writes both `send_requested` and `send_failed` to `customer_portal_access_token_events` in the route, the events-list route returns all event kinds with no filter, and `getCustomerPortalAccessTokenEventLabel` returns "Send requested" / "Send failed" for them. After a send attempt, operators opening the History drawer will see these events. This contradicts both the proposal and the deferred-copy list, which explicitly tagged `Send attempted` and `Send failed` as future events. Two options: (a) filter `send_requested` and `send_failed` out of the events-list route response for now (simplest fix — one `.not.in("kind", ["send_requested", "send_failed"])` clause on the query), or (b) accept the early exposure and update the deferred list accordingly, with the understanding that the drawer now shows send events in V1.

10. **`send_requested` event written before confirming the webhook is reachable.** In `send/route.ts`, `recordCustomerPortalAccessTokenEvent({ kind: "send_requested" })` fires before `sendThroughProvider()`. If `sendThroughProvider` throws (webhook not configured, 503 case), a `send_failed` event is also written. The history drawer then shows `send_requested → send_failed` for a send that never left the server. The route test at line 122–136 confirms this path: the test asserts `serviceClient.from` was called with `"customer_portal_access_token_events"` even on 503. Fix: check `webhookUrl` presence at the top of the handler before writing any event, or move the `send_requested` write to after a successful `sendThroughProvider` call.

11. **"Send new link" per-row is generate + send, not resend of existing token.** The proposal's `[Resend]` concept called the send route with an existing token ID. The implementation generates a fresh token first (`createToken.mutateAsync`) then sends it. This is the correct design — raw token URLs are session-only and can't be reconstructed from stored records — but it introduces a consequence the proposal didn't address: every "Send new link" action silently creates a new portal token, potentially increasing the active-token count. A customer who has "Send new link" pressed three times now has three active tokens (the original plus two fresh ones). The readiness card handles this (shows "N active links — consider revoking"), but the row action itself gives no indication that a new token is created. Consider a tooltip or inline note: `Send new link (generates a fresh token)`, or document this behavior in a proposal addendum.

## Out of scope (parked, OK)

- **Email-only / phone-only readiness card states** — The proposal's provider-context send readiness refinements ("Email contact only" / "Phone contact only") were not implemented. `hasContact` remains a boolean; partial-contact states are absent. Acceptable for V1 — the binary "No contact saved" vs. contact-present split is sufficient for the current send path, which routes to whatever channel the provider selects.
- **Per-row persistent send status line ("Send requested [date]")** — `freshSendRequestedId` provides session-scoped row-level success feedback, but there is no durable "Send requested [date]" line on the row across page reloads. Codex-review flagged this as a V1 open question; session-only feedback is acceptable.
- **Resend cooldown/throttle UI** — Open question 3 from the proposal. Not implemented. Acceptable for V1.
- **Provider setup onboarding nudge, delivery receipt, send count badge, revoke-on-send** — All correctly parked per proposal follow-up list.
- **Focus return to `[Copy again]` after send success** — Proposal accessibility item 6. Not implemented. Low priority for V1 but worth a follow-up ticket.
- **`role="alert"` on the revoke error** (line 906–910) — Pre-existing gap from prior slices, not introduced here. Out of scope for this critique.

## Verification needed after fixes

- **Issue 9 (send events in drawer):** Open the History drawer for a token after sending. Confirm "Send requested" appears. Decide whether to filter or accept, then update the deferred-copy list in the proposal accordingly.
- **Issue 10 (event ordering):** Review the route event-write sequence. If fixing, confirm the 503-path test at line 122–136 no longer calls `customer_portal_access_token_events` when the webhook is unconfigured.
- **Issue 5 (hidden vs. disabled):** Verify that hiding "Send new link" on token rows when `!providerReady` does not leave the token row action area empty for active tokens — only "History" and "Revoke" should remain in the manual-only state.
- **Issue 6 (error position):** After moving `freshSendError` inside the token row, confirm `role="alert"` is announced correctly and not swallowed by the surrounding row's DOM nesting.
- **Issue 11 (generate + send = new token):** After a "Send new link" action, verify the readiness card updates to reflect the new active-token count. Confirm the newly generated link lands in `latestLink` session state and is accessible from `[Copy again]`.
- **Issue 7 (aria-busy):** Confirm `aria-busy="true"` is announced by VoiceOver/NVDA during the in-flight state.

## Suggested ordering

**Quick fixes (1–3 lines each):**
Issues 7, 3 — `aria-busy` on in-flight buttons; `Sending new…` Unicode ellipsis.

**Copy sweep (component strings + test assertions):**
Issues 2, 4 — chevron and send-requested copy. One commit, one test-assertion update pass.

**Design decisions before cutting:**
Issue 5 — hidden vs. disabled for `!providerReady`. Removes disabled-button noise from every token row in manual-only mode.
Issue 9 — send events in drawer. If filtering: one-line addition to the events route. If accepting: update the proposal's deferred-copy list.

**Medium (8–15 lines):**
Issue 1 — gate `providerCopy` line in readiness card to no-provider/no-dominant-active-state only.
Issue 6 — move `freshSendError` inside the affected token row block.

**Backend correctness (own ticket):**
Issue 10 — `send_requested` event written before webhook succeeds. Low urgency in production but noisy in test environments.

**Architecture discussion (next provider slice):**
Issue 8 — provider-blocked vs. retryable failure distinction.
Issue 11 — document/label the generate-plus-send behavior on the row action.
