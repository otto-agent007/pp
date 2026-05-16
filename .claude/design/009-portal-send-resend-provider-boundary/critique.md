# Critique: Portal Send/Resend Provider Boundary V1 (post-implementation)

Reviewed: implementation lives in `apps/web/app/customers/customer-portal-links.tsx`, `apps/web/hooks/useCustomerPortalAccess.ts`, `apps/web/app/api/portal/access-tokens/send/route.ts`, and `apps/web/app/api/portal/access-tokens/provider-status/route.test.ts`.

---

## What's correct against the proposal

- `useSendCustomerPortalAccessToken` hook exists in `useCustomerPortalAccess.ts` and calls `sendCustomerPortalAccessToken` from domain — correct boundary.
- `useCustomerPortalProviderStatus` query fetches `/api/portal/access-tokens/provider-status`, which returns `{ provider: "webhook" | "manual", webhook_configured: bool }` without exposing the webhook URL or secret — correct AGENTS boundary.
- `providerReady = providerStatus.data?.provider === "webhook"` — correct gate. Send/resend UI is fully hidden when provider is not webhook-ready.
- Post-generation `[Send link ▶]` button appears only when `latestLink && providerReady` — matches proposal.
- `[Send link]` is disabled and shows tooltip `"No contact saved — share the link manually"` when `!hasContact` — matches proposal exactly.
- `aria-label="Send portal link via provider"`, `aria-busy`, `aria-disabled` all present on the send button — proposal's accessibility requirements met.
- `sendRequested` state replaces `[Send link]` with `✓ Send requested.` after success — matches proposal copy and behavior.
- `role="alert"` on `sendError` paragraph — matches proposal.
- `[Copy again]` and `[Generate new]` remain enabled while send is in flight — manual fallback never blocked.
- History drawer (`CustomerPortalTokenHistory`) unchanged — no send events rendered in drawer. Matches proposal intent for V1.
- Session notice `"This link is only available during this session…"` present and correct.
- Revoke confirm flow (`isConfirming`, `cancelRevokeRef`, `revokeConfirmPrompt`) unchanged — scope preserved.
- `POST /api/portal/access-tokens/send/route.ts` validates portal URL origin + pathname, re-derives access token from URL, and cross-checks against `token_hash` in the database — stronger security check than the proposal anticipated and unambiguously correct.
- Route enforces admin auth via `getAdminAccess`, checks token is active and not expired, checks customer has contact before hitting the provider.
- Webhook payload (`CustomerPortalSendProviderPayload`) exposes customer name, email, phone, portal URL, customer ID, and token ID — but no `token_hash`, no service-role data, no internal notes. Correct AGENTS compliance.

---

## Visual / copy issues

**1. `customer-portal-links.tsx:551` — in-flight label uses `"..."` (three ASCII dots) instead of `"…"` (Unicode ellipsis).**
Current: `{sendToken.isPending ? "Sending..." : "Send link ▶"}`. Proposal copy bank: `"Sending…"`. Minor, but `"Revoking..."` and `"Generating..."` elsewhere in the component also use three dots. Recommend standardising to `…` throughout for typographic consistency.

**2. `customer-portal-links.tsx:863` — token-row send button label is `"Send new link"`, not `"Resend"`.**
The proposal specified `[Resend]` as the label for the per-token-row action. The implementation uses `"Send new link"` (and `"Sending new…"` in-flight). This is an intentional divergence (see Interaction §1 below) but is a copy drift. `"Send new link"` is actually the more accurate label for what the implementation does — it correctly communicates that a fresh token will be generated, not that the same link is resent. **The proposal copy bank should be updated to match, not the implementation.**

**3. `customer-portal-links.tsx:679` — provider status copy appears as a third line inside the readiness card body.**
The implementation appends it as a `<p>` inside the readiness card `<div>`:
```tsx
{showProviderCopy ? (
  <p className="mt-1 text-xs font-medium text-gray-500">{providerCopy}</p>
) : null}
```
States: `"Checking portal delivery provider..."` / `"Provider status unavailable. Manual copy remains available."` / `"Portal delivery provider is manual-only. Share links manually."`. These are clear and non-alarming, but when `showProviderCopy` is true alongside an existing `readinessCard.body`, the card has three lines of text. Consider rendering `providerCopy` at a slightly lighter weight (`text-gray-400`) or separated by a thin rule to signal it is supplementary status, not the primary readiness conclusion.

**4. `customer-portal-links.tsx:748` — `[Send link]` in clipboard-unavailable path wrapped in bare `<div>`.**
```tsx
<div>{sendButton}</div>
```
The surrounding `<div>` has no styling, which breaks flex alignment with the manual-copy row above it. Proposal layout specified `[Send link]` as `w-full sm:w-auto` in this path. Replace the bare `<div>` with `{sendButton}` directly (or `<div className="mt-1">{sendButton}</div>` to preserve spacing without disrupting flex).

---

## Interaction / state issues

**1. Token-row resend generates a new token instead of resending the existing one.**
The proposal specified `[Resend]` as a button that calls `POST /api/portal/send` with the **existing** token ID. The implementation (`sendNewLink` function, lines 424–483) instead:
1. Calls `createToken.mutateAsync(...)` to generate a **fresh** token with the same expiry
2. Attempts to copy the new link to clipboard
3. Then calls `sendToken.mutateAsync(...)` on the fresh token

This is a meaningful behavioral divergence. The rationale is sound — resending the exact same link could be a security concern if the access token has already been shared and may be stale. However:
- There is no proposal coverage for the token-generation step failing mid-`sendNewLink` (handled at line 445–449 with `freshSendError`). The error copy `"Couldn't generate a new link to send. Try again."` is not in the proposal's copy bank.
- Clicking `[Send new link]` on an existing token creates a new token, potentially resulting in **two active links** if the old one wasn't revoked. Operators may not understand this.
- Recommend: add an inline note near `[Send new link]` clarifying that a fresh link will be generated and the old one stays active, or auto-revoke the old token as part of `sendNewLink`. The copy-only fix (option a) is in scope; auto-revoke (option b) is a non-trivial scope addition.

**2. `sendNewLink` sets `latestLink`, `latestTokenId`, and `setSendRequested(true)` — cross-zone side effects.**
If `sendNewLink` succeeds, it calls `setSendRequested(true)` and `setMessage("✓ Fresh link copied to clipboard.")`, which update the **post-generation action area at the top of the component**, even though the operator clicked a button on a specific token row. The operator interacting with row 3 of the audit list will silently see the top-of-component zone update with `"✓ Send requested."` and a new `[Generate new]` button.

Recommend: keep `sendNewLink` success state **scoped to the row** only, using `freshSend*` state. Do not call `setSendRequested` or `setMessage` from `sendNewLink`. The row-level `"✓ Send requested."` at line 912–915 is already sufficient feedback.

**3. Proposal's `Send requested [date]` / `Send failed [date]` / `Send blocked` row states are absent.**
The proposal defined persistent row-level send status phrases visible after page reload (if a durable send status field were implemented). The implementation uses `freshSendRequestedId` / `freshSendError`, which are session-only and scoped to the last row that triggered a send. After reload, token rows show no send history at all. This is the session-only V1 behaviour from open question 5 — acceptable — but the three send-status phrases from the copy bank are entirely absent from the current implementation.

**4. `[Send new link]` disabled behaviour for `!hasContact` differs from proposal.**
Proposal: `[Resend]` is **absent** (not disabled) when `hasContact = false`. Implementation: `[Send new link]` is **disabled** (`disabled={!hasContact || Boolean(freshSendingId)}`), showing `title="No contact saved — share the link manually"`. This is the "disabled with tooltip" option from open question 4, resolved in the opposite direction from Claude's recommendation (hidden). Both are valid; Codex chose disabled-with-tooltip. The behaviour is clearer to operators. Acceptable divergence — note for future audit.

**5. Focus management after send success (post-generation) is not implemented.**
Proposal: when `[Send link]` is replaced by `✓ Send requested.` text, focus should move to `[Copy again]`. No `useEffect` or `ref.focus()` call handles this transition. The operator's prior focus context (on the now-vanished `[Send link]` button) is lost. Recommend adding a `copyAgainRef` and calling `.focus()` after `setSendRequested(true)` in `sendLatestLink`.

---

## Scope drift

**6. `apps/web/app/api/portal/access-tokens/send/route.ts` persists `send_requested` and `send_failed` events.**
The proposal and codex-review explicitly deferred all persistent send events:

> Defer: persistent `send_attempted`, `send_requested`, `send_failed`, `send_blocked`, `delivered`… events.

The route writes `kind: "send_requested"` and `kind: "send_failed"` to the event log via `recordCustomerPortalAccessTokenEvent` on every send/fail. This means:
- These event kinds now exist in the database.
- If `getCustomerPortalAccessTokenEventLabel` in domain handles them, they **will appear in the `CustomerPortalTokenHistory` drawer** — directly contradicting the proposal's "no send events in drawer (V1)" principle.
- If domain does NOT handle them, the drawer silently receives unknown event kinds; fallback behaviour is unknown.

**Action needed:** Verify that `getCustomerPortalAccessTokenEventLabel` handles `send_requested` and `send_failed` gracefully (filters them out, or renders them with an explicit decision to do so). If they render in the drawer, the proposal's V1 boundary is violated and a decision is needed: either accept the drift and update the proposal, or add a filter in the event label function.

**7. `apps/web/app/api/automation/notifications/[notificationId]/deliver/route.ts` — parallel delivery route.**
A notifications delivery route exists at this path that also references provider-status. Whether it interacts with the portal send flow is unclear. No action needed from this critique, but Codex should confirm the two send pathways (portal send vs. automation notification deliver) are independent and cannot double-send portal links.

---

## Out of scope (parked, OK)

- **Partial contact readiness states** (`"Email contact only"`, `"Phone contact only"`) — not implemented. The proposal defined these for the provider-active path. The implementation uses a simpler provider-availability copy inside the readiness card instead. Acceptable for V1; the contact-type granularity can be added when multi-channel send is supported.
- **Resend cooldown / throttle UI** — open question 3, correctly deferred.
- **Send channel display** — out of scope, correctly absent.
- **Persistent `send_status` field on token record** — open question 5, not implemented. Session-only send confirmation is the V1 behaviour.
- **Provider setup onboarding nudge** — follow-up, correctly absent.

---

## Verification needed after fixes

1. **Issue 6 (send events in drawer):** Open the history drawer for a token that has been sent via the new route. Confirm whether `"send_requested"` or `"send_failed"` events appear. If they do, a decision is needed before this is considered settled.
2. **Issue 2 (cross-zone side effects):** Click `[Send new link]` on a token row and verify the post-generation action area at the top of the component is **not** updated.
3. **Issue 1 (two active links after `sendNewLink`):** After a successful `[Send new link]` call, confirm both the old and new tokens appear as active in the audit list. Decide whether to warn operators or auto-revoke.
4. **Issue 4 (`[Send link]` flex in clipboard-unavailable path):** Test on a narrow viewport (< 375 px) with `providerReady = true`. Confirm the button does not overflow.
5. **Issue 5 (focus after send success):** Tab to `[Send link]`, activate it, and confirm where focus lands after `sendRequested` becomes true.

---

## Suggested ordering

**Immediate (pre-merge critical):**
- **Issue 6** — verify `send_requested` / `send_failed` event handling in the drawer. If they appear, this directly violates the proposal boundary and needs resolution.
- **Issue 2** — `sendNewLink` updating the post-generation zone is a confusing cross-zone side effect. Fix: remove `setSendRequested(true)` and `setMessage(...)` from `sendNewLink`.

**Quick wins:**
- **Issue 1** — add inline copy near `[Send new link]` clarifying a fresh link will be generated. One line of copy, no logic change.
- **Issue 5** — add `copyAgainRef` + `.focus()` after `setSendRequested(true)`. 5-line patch.
- **Issue 3** — adjust `providerCopy` visual weight inside the readiness card.

**Polish (lower priority):**
- **Issue 1b** — standardise `...` → `…` across all in-flight button labels.
- **Issue 4** — remove bare `<div>` wrapper around `{sendButton}` in clipboard-unavailable path.
