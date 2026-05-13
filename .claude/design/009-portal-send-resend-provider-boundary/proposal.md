# Proposal: Portal Send/Resend Provider Boundary V1

## Goal & non-goals

- **Goal:** Define the operator-facing UI states, copy, and workflow expectations for a future provider-backed portal send/resend flow in `CustomerPortalLinks` — so that today's manual-copy path stays correct and complete, and Codex can introduce `[Send link]` and `[Resend]` controls against a future approved route without redesigning the component or revisiting copy decisions.
- **Non-goals:** implementing any provider delivery; selecting email or SMS vendors; creating send/resend routes, secrets handling, or delivery polling; schema changes, migrations, RLS policies, or event writes; persisting copy/manual-share events; changing token hashing, expiry, revocation, or audit-event security; approving any production database change; adding new customer contact fields; replacing or hiding the manual copy fallback.

---

## Approach

`CustomerPortalLinks` (`apps/web/app/customers/customer-portal-links.tsx`) already has three well-defined zones from prior slices: share readiness card, generate + share action area, and token audit list. The component already receives `customerContact: { email: string | null; phone: string | null }` from its call site in `customers-client.tsx` (line 611) and derives `hasContact` from it. The token history drawer is already implemented via `CustomerPortalTokenHistory`.

This proposal makes two targeted additions that are **rendered only when a future `providerSendEnabled` signal is present**:

1. **`[Send link]` slot** — inserted into the post-generation action row between `[Copy again]` and `[Generate new]`. Calls a future `POST /api/portal/send` route that Codex owns entirely. Hidden (not just disabled) until the route exists.
2. **`[Resend]` slot** — inserted into each active token row between the send-status line and `[Revoke]`. Calls the same future route with an existing token ID. Hidden until the route exists.

No new hooks, domain helpers, types, API client calls, or schema changes belong in this slice. The contact readiness signals and "No contact saved" readiness card state are already live from slice 006. This proposal extends them to cover partial-contact and per-channel display for the send/resend context.

Manual copy fallback (`[Copy again]` / read-only URL field) remains present and primary at all times — before, during, and after any provider send attempt.

---

## Information hierarchy — `CustomerPortalLinks`

### Current state (no provider — identical to today)

```
┌─────────────────────────────────────────────────────────┐
│  Portal access                              [section h3] │
│  Generate links to share with this customer.  [subtitle] │
├─────────────────────────────────────────────────────────┤
│  SHARE READINESS CARD  (state-driven)                   │
├─────────────────────────────────────────────────────────┤
│  GENERATE + SHARE ACTION AREA                           │
│  Expires [date input]   [Generate link]                 │
│  ── post-generation ───────────────────────────────────  │
│  ✓ Link copied to clipboard.                            │
│  [Copy again]   [Generate new]                          │
├─────────────────────────────────────────────────────────┤
│  TOKEN AUDIT LIST  (dense rows, newest first)           │
│  ● Active  Created Apr 28 · Expires May 31              │
│    Never opened                             [Revoke]    │
│    [History ▾]                                          │
└─────────────────────────────────────────────────────────┘
```

### Future state (provider configured, `providerSendEnabled = true`)

```
┌─────────────────────────────────────────────────────────┐
│  Portal access                              [section h3] │
│  Generate links to share with this customer.  [subtitle] │
├─────────────────────────────────────────────────────────┤
│  SHARE READINESS CARD  (same, with extended contact     │
│  states for partial-contact send context)               │
├─────────────────────────────────────────────────────────┤
│  GENERATE + SHARE ACTION AREA                           │
│  Expires [date input]   [Generate link]                 │
│  ── post-generation ───────────────────────────────────  │
│  ✓ Link copied to clipboard.                            │
│  [Copy again]   [Send link ▶]   [Generate new]          │
│   ↑ manual       ↑ provider-backed (new)                │
├─────────────────────────────────────────────────────────┤
│  TOKEN AUDIT LIST                                       │
│  ● Active  Created Apr 28 · Expires May 31              │
│    Send requested May 2 · Never opened      [Resend]    │
│    [Revoke]   [History ▾]                               │
└─────────────────────────────────────────────────────────┘
```

The `providerSendEnabled` signal is a Codex-owned prop or feature flag passed into `CustomerPortalLinks`. Claude does not recommend any specific mechanism — it could be a boolean prop, a feature flag, or a context value — the component gates send/resend rendering on whatever signal Codex chooses.

---

## Share readiness card

The eight existing states from slice 006 remain unchanged. Three sub-states for "no contact" and "partial contact" are added to clarify send readiness when the provider is active.

### Existing states (unchanged)

| Condition | Status label | Body copy | Border accent |
|---|---|---|---|
| Loading | *(none)* | *"Loading portal status…"* | `border-l-gray-300` |
| Error (fetch) | *(none)* | *"Couldn't load portal links."* + [Retry] | `border-l-red-500` |
| No tokens at all | **No portal links** | *"Generate a link to share the customer portal."* | `border-l-gray-300` |
| No active links | **No active links** | *"All previous links are expired or revoked."* | `border-l-gray-300` |
| Active, opened | **Customer has accessed the portal** | *"Last opened [date]."* | `border-l-emerald-500` |
| Active, never opened | **Shared — not yet opened** | *"A portal link was shared but hasn't been opened."* | `border-l-amber-400` |
| Multiple active (>1) | **[N] active links** | *"Consider revoking older ones before sharing again."* | `border-l-amber-400` |
| No contact (no dominant active state) | **No contact saved** | *"This customer has no email or phone on file. Share the link manually."* | `border-l-gray-300` |

### Provider-context send readiness refinements (visible only when `providerSendEnabled = true`, no dominant active-link state)

These three states replace the "No contact saved" body copy with send-aware phrasing, and do not add new states visible in the no-provider path.

| Condition | Status label | Body copy | Border accent |
|---|---|---|---|
| No email and no phone | **No contact saved** | *"This customer has no email or phone on file. Use the manual copy fallback to share the link."* | `border-l-gray-300` |
| Email only | **Email contact only** | *"Send will use the email address on file. No phone number saved."* | `border-l-gray-300` |
| Phone only | **Phone contact only** | *"Send will use the phone number on file. No email address saved."* | `border-l-gray-300` |

**Ordering rule:** Contact-only readiness states are the lowest-priority. Any active-link state (opened, never-opened, multiple active, no active links) overrides the contact state entirely. Only surface contact state when there are no tokens at all, or no active links remain and the operator is about to generate a fresh link to send.

**No channel selection in V1.** The proposal does not expose email vs. SMS channel picker UI — channel routing is a Codex-owned provider concern. Body copy references "the contact on file" in the general case (see copy bank). The email-only / phone-only refinements above inform operators but do not offer a toggle.

---

## Generate + share action area

### Before generation (no change)

```
Expires  [date input]   [Generate link]
```

### After generation — clipboard available, no provider

```
✓ Link copied to clipboard.
[Copy again]   [Generate new]
```

*(Unchanged from current implementation.)*

### After generation — clipboard available, provider active (`providerSendEnabled = true`)

```
✓ Link copied to clipboard.
[Copy again]   [Send link ▶]   [Generate new]
```

- `[Send link]` is a secondary button: `min-h-9 rounded-md border border-gray-300 px-3 text-sm font-semibold text-neutralDark hover:bg-gray-50`.
- It sits between `[Copy again]` (leftmost manual affordance) and `[Generate new]` (rightmost reset action). The order reinforces that copy is the fallback, send is the feature, generate-new is the escape hatch.
- `aria-label="Send portal link via provider"` to distinguish from the copy action for screen readers.
- When `hasContact = false` and provider is active: `[Send link]` is disabled (`disabled:cursor-not-allowed disabled:bg-gray-400 disabled:text-white`), with `aria-disabled="true"` and `title="No contact saved — share the link manually"`. The manual copy affordance is unaffected.

### After generation — clipboard unavailable, provider active

```
Link ready — copy it manually:
[url read-only field]   [Copy]
Paste this into an email or text to share with the customer.
[Send link ▶]
```

- `[Send link]` appears below the manual-copy row as a full-width secondary button: `w-full` on mobile, `sm:w-auto` on larger breakpoints.
- Same disabled behavior when `hasContact = false`.

### Send link — in-flight state

```
✓ Link copied to clipboard.
[Copy again]   [Sending…]   [Generate new]
                ↑ disabled while in flight
```

- `[Sending…]` is the button label during the pending mutation: `disabled:cursor-not-allowed`.
- `[Copy again]` and `[Generate new]` remain enabled — manual fallback is never blocked by an in-flight send.
- `[Generate link]` (the generate-new button above) does not re-enter; it has already fired. This state is scoped to the post-generation zone.

### Send link — success / queued state

```
✓ Link copied to clipboard.  ✓ Send requested.
[Copy again]   [Generate new]
```

- `✓ Send requested.` appears in `text-xs font-semibold text-accent` on a new line below the copy confirmation.
- **Copy bank note:** Use "Send requested" not "Sent" or "Delivered." The provider may queue the message; delivery is not synchronous from the operator's perspective. Avoid implying the customer has received it.
- The `[Send link]` button is replaced by `✓ Send requested.` text and does not show a resend affordance in the post-generation zone — resend belongs on the token row.

### Send link — failure state

```
✓ Link copied to clipboard.
[Copy again]   [Send link ▶]   [Generate new]
Couldn't request send. Share the link manually or try again.
```

- Error copy: `text-xs font-semibold text-red-700 mt-1`.
- `[Send link]` re-enables immediately after failure — the operator can retry from here.
- Provider-blocked copy (distinct from a network error): *"Provider blocked this send. Share the link manually."* — `[Send link]` remains present but disabled; `aria-disabled="true"` with `title="Provider blocked — check provider configuration"`.

---

## Token audit list — send/resend slot

Send status and the `[Resend]` control are additions to active token rows only, gated on `providerSendEnabled`.

### Row structure with send status (provider active)

```
┌─────────────────────────────────────────────────────────┐
│ ●  Active                            Created Apr 28     │
│    Expires May 31                                       │
│    Send requested May 2 · Never opened      [Resend]    │
│    [Revoke]   [History ▾]                               │
└─────────────────────────────────────────────────────────┘
```

- **Line 1:** State dot + state label (left) · Created date (right) — `text-xs font-semibold`.
- **Line 2:** Expiry/no-expiration — `text-xs text-gray-500`.
- **Line 3 (new, provider only):** Send status phrase · opened phrase — `text-xs text-gray-500`.
- **Line 4 (new, provider only):** `[Resend]` (right of line 3 or on line 4 at small breakpoints) · `[Revoke]` · `[History ▾]`.

At narrow viewports, `[Resend]`, `[Revoke]`, and `[History ▾]` stack into a `flex-wrap gap-2` row. Minimum touch target: `min-h-9`.

### Send status phrases (line 3, left portion)

| Condition | Send status phrase |
|---|---|
| Never sent (no prior send attempt) | *(omit — no send status line shown)* |
| Send requested (in queue, no delivery confirmation) | `Send requested [date]` |
| Send failed (provider returned error) | `Send failed [date]` |
| Provider blocked (provider refused this request type) | `Send blocked` |
| Send in flight (current resend attempt pending) | `Sending…` |

**Delivery uncertainty principle:** No phrase claims the customer "received" or "opened" a sent message. "Send requested" is the strongest positive assertion. "Sent" as a status word is deferred until Codex implements a provider delivery confirmation path.

**Opened phrase (existing, no change):** `· Opened [date]` / `· Never opened` — continues unchanged regardless of send status. The two facts (send status and opened status) are independent. An operator can see "Send requested May 2 · Opened May 3" and understand the customer received and opened the portal after the send.

### `[Resend]` button

- Appears on active token rows only, when `providerSendEnabled = true`.
- Placement: after send status text, before `[Revoke]`.
- Styling: `min-h-9 rounded-md border border-gray-300 px-3 text-xs font-semibold text-neutralDark hover:bg-gray-50`.
- `aria-label="Resend portal link for token created [date]"` — scoped to the specific row for screen readers.
- When `hasContact = false`: button is absent (not disabled). Send is not possible, and showing a disabled resend adds noise when manual copy is the only path.

### `[Resend]` in-flight state

```
[Sending…]  [Revoke]  [History ▾]
```

- `[Sending…]` is disabled during the pending mutation.
- `[Revoke]` and `[History ▾]` remain enabled — resend does not block revoke.
- No optimistic row update while resend is in flight. Only the button label changes.

### `[Resend]` success state

```
Send requested [date]  · Never opened    [Resend]  [Revoke]  [History ▾]
```

- The send status line updates to `Send requested [now]`.
- `[Resend]` re-enables for future retries.
- No inline confirmation ("✓ Resend requested") — the row status update is the feedback signal.

### `[Resend]` failure state

```
Send failed [date]  · Never opened    [Resend]  [Revoke]  [History ▾]
Couldn't request resend. Try again or share the link manually.
```

- Inline error: `text-xs font-semibold text-red-700` immediately below the affected row, consistent with existing revoke-error placement.
- `[Resend]` re-enables. `[Copy again]` in the post-generation zone, or the read-only URL field if `latestLink` is still in session, provides the manual fallback path.

### Provider-blocked state on token row

```
Send blocked  · Never opened    ——  [Revoke]  [History ▾]
```

- `[Resend]` is absent (provider refuses this send type; retrying would fail again). Codex decides whether "blocked" is a permanent or recoverable state at the provider layer.
- Body: send status phrase is `Send blocked`, no date.
- If the operator hovers or focuses the status text: no tooltip in V1. The blocked state is informational copy only.

---

## Send/resend coexistence with the history drawer

The history drawer (`CustomerPortalTokenHistory`) currently shows `generated`, `opened`, and `revoked` events — V1 server-observable lifecycle events only, per slices 007 and 008.

### What changes in V1 (provider slice)

Nothing changes in the drawer. The drawer renders exactly the same events it receives from `useCustomerPortalAccessTokenEvents`. No send/delivery events appear there until Codex implements provider delivery event writes, which were explicitly deferred in slice 008.

### What the operator sees when send status and drawer coexist

```
● Active  Created Apr 28 · Expires May 31
  Send requested May 2 · Never opened
  [Resend]  [Revoke]  [History ▾]

  ▾ Event history for this link
  ┌─────────────────────────────────────────┐
  │ Generated          by an admin  Apr 28  │
  └─────────────────────────────────────────┘
  (No opened or revoked events yet.)
```

- The send status row ("Send requested May 2") lives **outside** the drawer, on the collapsed token row. It is UI-layer state derived from the send mutation result, not a persisted event.
- The history drawer shows only server-persisted lifecycle events. "Send requested" never appears inside the drawer in V1.
- There is no visual inconsistency: the operator sees send status as a row-level live signal and the drawer as an archived record of what the server has durably persisted.
- When the customer opens the portal, the opened event will appear in both the drawer (as a `Generated → Opened` event line) and the row (as `· Opened [date]` in the opened phrase). The send status line remains unchanged — opening the portal is independent of when the send was requested.

### Deferred copy/events for later slices

The following send/delivery event labels are defined here for future use but **must not be rendered in V1**:

- `Send attempted` — a provider delivery attempt was made (future persistent event)
- `Delivery confirmed` — provider returned a delivery receipt (future)
- `Send failed` — provider returned a delivery failure (future persistent event)
- `Send blocked` — provider refused this message type (future persistent event)
- `Copied` — admin copied the link during this session (future, session-only, not persistent)
- `Manually shared` — admin confirmed manual share (future, if ever)
- `Expired` — token reached its expiry date (deferred materialized event per slice 008)

These labels appear in the copy bank below but are marked `[deferred]` to signal they are not for V1 rendering.

---

## State map

| State | Location | Treatment |
|---|---|---|
| **No provider (`providerSendEnabled = false`)** | Entire component | No send/resend controls rendered. Current behavior unchanged. |
| **Loading (token list)** | Readiness card + audit list | Existing skeleton behavior unchanged. |
| **Error (token list fetch)** | Readiness card | Existing retry behavior unchanged. |
| **No tokens, no contact** | Readiness card | "No contact saved" with manual-share copy. |
| **No tokens, email only** | Readiness card (provider on) | "Email contact only" — send will use email on file. |
| **No tokens, phone only** | Readiness card (provider on) | "Phone contact only" — send will use phone on file. |
| **No tokens, has contact** | Readiness card | Existing "No portal links" state. |
| **Active, opened** | Readiness card | Existing "Customer has accessed the portal" state. |
| **Active, never opened** | Readiness card | Existing "Shared — not yet opened" state. |
| **Multiple active** | Readiness card | Existing "[N] active links" state. |
| **No active links** | Readiness card | Existing "No active links" state. |
| **Post-generation, clipboard available, no provider** | Action area | Existing "✓ Link copied" + `[Copy again]` + `[Generate new]`. |
| **Post-generation, clipboard available, provider on, has contact** | Action area | `[Copy again]` + `[Send link]` + `[Generate new]`. |
| **Post-generation, clipboard available, provider on, no contact** | Action area | `[Copy again]` + `[Send link]` (disabled, `title` tooltip) + `[Generate new]`. |
| **Post-generation, clipboard unavailable, provider on** | Action area | Read-only URL field + `[Copy]` + helper text. `[Send link]` below as secondary. |
| **Send in flight (post-generation)** | Action area | `[Sending…]` replaces `[Send link]`; copy controls unaffected. |
| **Send success (post-generation)** | Action area | `✓ Send requested.` below copy confirmation; `[Send link]` removed from this zone. |
| **Send failure (post-generation)** | Action area | `[Send link]` re-enabled; error copy below: *"Couldn't request send. Share the link manually or try again."* |
| **Send provider-blocked (post-generation)** | Action area | `[Send link]` disabled; error copy: *"Provider blocked this send. Share the link manually."* |
| **Generate error** | Action area | Existing `text-red-700 text-xs` below generate button. |
| **Token row — active, never sent** | Audit row | No send status line. `[Resend]` shown if provider on. |
| **Token row — send requested** | Audit row | `Send requested [date]` on row line 3. `[Resend]` enabled. |
| **Token row — send in flight (resend)** | Audit row | `[Sending…]` replaces `[Resend]`; `[Revoke]` unaffected. |
| **Token row — send failed** | Audit row | `Send failed [date]` on row line 3; error copy below row; `[Resend]` re-enabled. |
| **Token row — send blocked** | Audit row | `Send blocked` on row line 3; `[Resend]` absent. |
| **Token row — no contact, provider on** | Audit row | `[Resend]` absent entirely. Manual copy is the only forward path. |
| **Revoke in flight** | Audit row | Existing `[Revoking…]` behavior unchanged; `[Resend]` unaffected. |
| **Revoke confirmation** | Audit row | Existing inline confirm flow; `[Resend]` hidden during confirm state. |
| **History drawer open** | Audit row | Send status line visible above drawer. Drawer shows server-persisted events only (`generated`, `opened`, `revoked`). No send events in drawer (V1). |

---

## Copy bank

### Readiness card — existing (no change)
- `Loading portal status…`
- `Couldn't load portal links.`
- `No portal links` / `Generate a link to share the customer portal.`
- `No active links` / `All previous links are expired or revoked.`
- `Customer has accessed the portal` / `Last opened [date].`
- `Shared — not yet opened` / `A portal link was shared but hasn't been opened.`
- `[N] active links` / `Consider revoking older ones before sharing again.`
- `No contact saved` / `This customer has no email or phone on file. Share the link manually.`

### Readiness card — provider-context additions (provider on, no dominant active state)
- `No contact saved` / `This customer has no email or phone on file. Use the manual copy fallback to share the link.`
- `Email contact only` / `Send will use the email address on file. No phone number saved.`
- `Phone contact only` / `Send will use the phone number on file. No email address saved.`

### Send button labels
- `Send link` / `Sending…`
- `Resend` / `Sending…` (per-row)

### Send status phrases (row line 3)
- `Send requested [date]`
- `Send failed [date]`
- `Send blocked`
- `Sending…`

### Send outcome copy (post-generation zone)
- `✓ Send requested.`
- `Couldn't request send. Share the link manually or try again.`
- `Provider blocked this send. Share the link manually.`

### Send outcome copy (per-row resend errors)
- `Couldn't request resend. Try again or share the link manually.`

### Disabled send tooltip (`title` attribute, not visible copy)
- `No contact saved — share the link manually`
- `Provider blocked — check provider configuration`

### Delivery uncertainty note (accessible copy context)
- `Send requested` (not "Sent", not "Delivered") — signals the operation was submitted; delivery is not confirmed.

### Existing action area copy (no change)
- `Generate link` / `Generating…`
- `Copy again` / `Copied!`
- `Copy` / `Copied!`
- `Generate new`
- `✓ Link copied to clipboard.`
- `Link ready — copy it manually:`
- `Paste this into an email or text to share with the customer.`
- `This link is only available during this session. Reload the page and it's gone — generate a new one to reshare.`
- `Couldn't generate portal link. Try again.`

### Deferred copy (defined here, not rendered in V1)
- `[deferred] Send attempted [date]` — future persistent event label
- `[deferred] Delivery confirmed [date]` — future provider delivery receipt
- `[deferred] Send failed [date]` — future persistent event in drawer
- `[deferred] Send blocked` — future persistent event in drawer
- `[deferred] Copied` — future session-event in drawer
- `[deferred] Manually shared` — future, if ever
- `[deferred] Expired [date]` — future materialized event in drawer

---

## Layout notes

**Send button placement in action area:** `flex flex-col gap-2 sm:flex-row sm:items-center` wrapper. Button order left→right on sm+: `[Copy again]` → `[Send link]` → `[Generate new]`. On mobile (flex-col): stacked in same order top→bottom. This preserves the spatial pattern: manual fallback first, provider action second, reset last.

**Send button styling:** secondary — `min-h-9 rounded-md border border-gray-300 px-3 text-sm font-semibold text-neutralDark hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50`. Not a destructive style (not red). Not a primary style (not filled `bg-primary`) — send is important but less frequent than generate; visual hierarchy should not suggest it replaces generate.

**`✓ Send requested.` line:** `text-xs font-semibold text-accent mt-0.5` on its own line below the copy confirmation. Keeps the two confirmations visually distinct (copy = one line, send = second line) without requiring a new zone.

**Token row line 3 (send status):** `flex items-center justify-between px-3 pb-1 text-xs text-gray-500`. Send status phrase on the left; `[Resend]` inline-right. At very narrow viewports, `flex-wrap` so `[Resend]` falls to its own line but stays within the row block.

**Row action buttons line (line 4):** `flex flex-wrap gap-2 px-3 pb-2 text-xs`. `[Revoke]` keeps its existing red border styling. `[History ▾]` / `[History ▴]` keeps its existing neutral styling. No styling change to either.

**Session notice:** unchanged — `text-xs text-gray-400 italic mt-1`.

**Skeleton rows:** unchanged — `h-12 animate-pulse rounded bg-gray-100`.

---

## Accessibility and keyboard concerns

1. **`[Send link]` focus position.** In the post-generation zone, `[Send link]` sits between `[Copy again]` and `[Generate new]` in DOM order. Tab sequence: `[Copy again]` → `[Send link]` → `[Generate new]`. This is a natural left-to-right reading order. No `tabindex` changes needed.

2. **Disabled `[Send link]`** must use both `disabled` (for button semantics) and `aria-disabled="true"` (for ARIA consumers). The `title` attribute surfaces the reason on hover/focus for sighted users; add a visually hidden `<span>` if the tooltip is not announced by target screen readers (defer this decision to implementation).

3. **`[Resend]` aria-label.** Each token row's `[Resend]` must be distinguishable from others: `aria-label="Resend portal link created [date]"`. Mirror the existing `[Revoke]` aria-label pattern in the component.

4. **`[Sending…]` state.** When the button transitions from `[Send link]`/`[Resend]` to `[Sending…]`, `aria-busy="true"` on the button communicates in-progress state to assistive technology without requiring a live region.

5. **Error announcements.** Send failure copy (`"Couldn't request send…"`) appears inline below the action zone or affected row. Wrap in `role="alert"` so it is announced to screen readers immediately on appearance, consistent with the existing revoke error treatment in the component.

6. **Focus on send success (post-generation).** When `[Send link]` disappears after success and `✓ Send requested.` text appears, the previously focused button is gone. Move focus to `[Copy again]` as the most semantically natural next action. This mirrors the existing pattern where generating a link moves focus to the copy zone.

7. **Focus on resend success (token row).** After resend completes (success or failure), focus returns to the `[Resend]` button for that row (re-enabled). This matches the existing revoke focus-return pattern (`returnFocusTokenIdRef`).

8. **Keyboard in confirm state (revoke).** The existing revoke confirm state hides `[Resend]` for the affected row while confirming. This is already handled by the `isConfirming` flag per-row and requires no new logic.

---

## AGENTS conformance self-check

| Concern | Plan | Status |
|---|---|---|
| **No direct Supabase from UI** | No new Supabase calls. All data through existing `useCustomerPortalAccessTokens` et al. Send/resend mutation will use a future `packages/api-client` method — Codex owns the route and client function. | ✅ |
| **All data access through `packages/api-client`** | The future `useSendCustomerPortalLink` hook (Codex-owned) must call through `packages/api-client/portal.ts`, never directly. | ✅ (guidance) |
| **Business logic in `packages/domain`** | Send-status derivation (e.g., "is this row in a blocked state?") belongs in a domain helper, not in `CustomerPortalLinks`. Codex decides the exact helper; this proposal names the behavior, not the function. | ✅ (guidance) |
| **Shared contracts in `packages/types`** | `PortalSendStatus`, `PortalSendResult`, or equivalent types must live in `packages/types` when Codex implements them. Not defined here. | ✅ (deferred to Codex) |
| **No raw portal URL, token, hash, or provider secret in UI** | `[Send link]` and `[Resend]` pass the token ID to the future route. No URL, token hash, provider key, webhook payload, or raw actor ID is surfaced. | ✅ |
| **No schema changes** | Zero infra changes in this slice. | ✅ |
| **No automatic delivery** | Send/resend is user-initiated only. No polling loop, webhook, scheduler, or background delivery in the UI. | ✅ |
| **Manual copy fallback preserved** | `[Copy again]` and the read-only URL field remain present and enabled at all times, independent of send/resend state. | ✅ |
| **Customer-safe portal boundary** | Send status phrases ("Send requested", "Send failed") describe the operator's request, not customer behavior. No customer email address, phone number, or delivery channel is surfaced in the UI. | ✅ |
| **Delivery uncertainty** | Copy uses "Send requested" not "Sent" or "Delivered." No claim that the customer received or opened a provider-sent message. | ✅ |
| **No route creation, migration, RLS, or secrets** | Claude proposes UI only. Codex owns route design, `POST /api/portal/send`, provider secrets, delivery event writes, and any database change. | ✅ |

---

## Open questions for Codex

1. **Provider readiness signal.** The proposal gates send/resend on a `providerSendEnabled` signal. What mechanism should Codex use — a boolean prop passed from `customers-client.tsx`, a React context, an environment-based feature flag, or a server-fetched config? The UI guidance is the same regardless; the implementation approach belongs to Codex.

2. **Send route shape.** The future `POST /api/portal/send` route would receive at minimum a token ID and the authenticated admin session. Does it return a status code only, or a delivery-status payload? The send status phrases above assume only "requested" (queued) or "failed" in V1. If the provider can confirm delivery synchronously, the copy bank should be extended.

3. **Resend throttle or cooldown.** Should `[Resend]` be disabled for N minutes after a successful send to prevent spam? The UI can accommodate a `disabledUntil` timestamp on the mutation result. Codex decides whether to enforce this at the route layer, the UI layer, or both.

4. **No-contact `[Resend]` decision.** The proposal removes `[Resend]` entirely when `hasContact = false`. An alternative is a disabled `[Resend]` with a tooltip. The hidden approach is cleaner but means the operator gets no visible signal that send would be available if they added contact info. Codex should decide: hide or disable-with-tooltip?

5. **Send status persistence.** In V1, send status on a token row ("Send requested May 2") is derived from the send mutation result — it is session-only and disappears on reload, exactly like `latestLink`. Is this acceptable for V1, or should Codex implement a minimal persisted `send_status` field on the token record (no full event table required) so the row shows send history across sessions? The deferred event copy list above assumes full events are a later slice, but a simple status field is lower scope.

6. **Multiple resend history.** If an operator resends three times, the row currently shows only the most recent "Send requested [date]." Should the history drawer eventually show resend attempts as events? The proposal defers this to a future slice. Codex should confirm that V1 resend attempts are not expected to appear in the drawer.

7. **Provider-blocked vs. failed distinction.** The proposal distinguishes "provider blocked" (provider refused, `[Resend]` absent) from "send failed" (transient error, `[Resend]` re-enabled). Codex must decide how the route communicates this distinction — a response status code, an error code in the response body, or a specific error message. The UI consumes whatever signal the route returns.

---

## Follow-up ideas (out of scope, noted per the brief)

- **Provider setup onboarding.** When `providerSendEnabled = false` and an admin has admin-level permissions, consider a one-time "Configure provider" nudge in the portal access section header. Entirely out of scope for this UI-guidance slice — requires provider config screens and permissions context.
- **Delivery receipt confirmation.** Once the provider can return a delivery receipt (synchronously or via webhook), the send status line can upgrade from "Send requested" to "Delivered [date]." Requires a new event type and route changes.
- **Send channel display.** Once multi-channel send (email vs. SMS) is supported, show the channel inline: "Send requested via email · May 2." Requires Codex to return channel metadata from the send route.
- **Send count badge.** For high-volume customers, a "Sent 3 times" count on the token row could help admins track follow-up cadence without opening the drawer. Requires persisted send event records.
- **Revoke-on-send.** An option to automatically revoke all other active links when sending a new one, reducing the "N active links" readiness warning. Complex interaction; out of scope.
- **Customer-visible send status.** Exposing "you have a portal link waiting" to the customer via a separate notification pathway. Entirely customer-facing and out of scope for this operator UI slice.
