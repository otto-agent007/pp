# Proposal: Portal Send/Resend Boundary V1

## Goal & non-goals

- **Goal:** Define the compact UI hierarchy, copy, and interaction states for manual share, future provider-backed send, and future resend affordances in `CustomerPortalLinks` — so that (a) the current manual-copy flow is clean and correct today, and (b) Codex can slot in send/resend buttons against a future server route without redesigning the component.
- **Non-goals:** implementing email, SMS, webhook, or queue delivery; adding a database audit table or persistent send-event log; changing token authorization, hashing, expiry, or revoke behavior; adding new customer contact fields; creating migrations; designing mobile offline write behavior.

---

## Approach

The existing `CustomerPortalLinks` (`apps/web/app/customers/customer-portal-links.tsx`) is already well-structured into three zones from slice 002. This slice makes three targeted additions:

1. **Contact readiness state** — extend the share readiness card to surface a "no contact saved" state so admins know whether a future send is even possible. Requires passing `customerContact` as a new optional prop from `customers-client.tsx` (no new API call — `customer.phone` and `customer.email` are already on the `Customer` object in scope at the call site, line 611).

2. **Send/resend placeholder slots** — specify exactly where `[Send link]` (post-generation) and `[Resend]` (per active token row) belong in the layout. Codex gates their rendering on a `providerReady` prop or feature flag. In the current slice these slots are **not rendered** — the spec exists so Codex doesn't have to redesign the layout when the provider route lands.

3. **Exhaustive copy and state map** — all send/resend/failure/retry labels are defined here so Codex can implement them directly without copy decisions at implementation time.

No new routes, no new hooks, no domain changes, no schema changes. All existing hooks (`useCustomerPortalAccessTokens`, `useCreateCustomerPortalAccessToken`, `useRevokeCustomerPortalAccessToken`) remain unchanged.

---

## Information hierarchy — `CustomerPortalLinks`

### Current slice (no provider, manual share only)

```
┌─────────────────────────────────────────────────────────┐
│  Portal access                             [section h3]  │
│  Generate links to share with this customer.  [subtitle] │
├─────────────────────────────────────────────────────────┤
│  SHARE READINESS CARD  (state-driven, 8 states below)   │
├─────────────────────────────────────────────────────────┤
│  GENERATE + SHARE ACTION AREA                           │
│  Expires [date input]   [Generate link]                 │
│  ── post-generation (clipboard available) ────────────  │
│  ✓ Link copied to clipboard.                            │
│  [Copy again]   [Generate new]                          │
│  ── post-generation (clipboard unavailable) ──────────  │
│  Link ready — copy it manually:                         │
│  [url read-only field]  [Copy]                          │
│  Paste this into an email or text...                    │
├─────────────────────────────────────────────────────────┤
│  TOKEN AUDIT LIST  (dense rows, newest first)           │
│  ● Active  Created Apr 28 · Expires May 31              │
│    Never opened                             [Revoke]    │
└─────────────────────────────────────────────────────────┘
```

### Future slice (provider configured, send/resend slots active)

```
┌─────────────────────────────────────────────────────────┐
│  Portal access                             [section h3]  │
│  Generate links to share with this customer.  [subtitle] │
├─────────────────────────────────────────────────────────┤
│  SHARE READINESS CARD  (same, plus contact state)       │
├─────────────────────────────────────────────────────────┤
│  GENERATE + SHARE ACTION AREA                           │
│  Expires [date input]   [Generate link]                 │
│  ── post-generation ───────────────────────────────────  │
│  ✓ Link copied to clipboard.                            │
│  [Copy again]   [Send link ▶]   [Generate new]          │
│   ↑ manual      ↑ provider-backed                       │
├─────────────────────────────────────────────────────────┤
│  TOKEN AUDIT LIST                                       │
│  ● Active  Created Apr 28 · Expires May 31              │
│    Sent May 1 via email        [Resend]  [Revoke]       │
└─────────────────────────────────────────────────────────┘
```

---

## Share readiness card

One card, state-driven. Eight states covering all conditions named in the brief, including the new contact-readiness state.

| Condition | Status label | Body copy | Action signal | Border accent |
|---|---|---|---|---|
| Loading | *(none)* | *"Loading portal status…"* | — | `border-l-gray-300` |
| Error (fetch) | *(none)* | *"Couldn't load portal links."* | [Retry] | `border-l-red-500` |
| No tokens at all | **No portal links** | *"Generate a link to share the customer portal."* | → scroll-focus generate area | `border-l-gray-300` |
| No active links | **No active links** | *"All previous links are expired or revoked."* | → [Generate new link] (scroll-focus) | `border-l-gray-300` |
| Active, opened | **Customer has accessed the portal** | *"Last opened [date]."* | → [Generate new link] (secondary text) | `border-l-emerald-500` |
| Active, never opened | **Shared — not yet opened** | *"A portal link was shared but hasn't been opened."* | → [Copy link] if `latestLink` in session, else [Generate new link] | `border-l-amber-400` |
| Multiple active (>1) | **[N] active links** | *"Consider revoking older ones before sharing again."* | → [Generate new link] (secondary text) | `border-l-amber-400` |
| No contact saved (no dominant active state) | **No contact saved** | *"This customer has no email or phone on file. Share the link manually."* | → [Generate new link] (scroll-focus) | `border-l-gray-300` |

**Contact readiness ordering:** check contact state last (lowest priority). If a customer has no contact but does have an active portal link that's been opened, the dominant state is "Customer has accessed the portal" — the contact gap is surfaced in the send/resend button tooltip when the provider route lands, not in the readiness card. Only surface the "No contact saved" card state when no other active-link state is dominant (i.e., no tokens, or no active links).

**Prop change:** add `customerContact?: { phone: string | null; email: string | null }` to `CustomerPortalLinks`. In `customers-client.tsx` at the existing call site (line 611), pass `customerContact={{ phone: customer.phone, email: customer.email }}`. The readiness card logic derives `const hasContact = Boolean(customerContact?.phone || customerContact?.email)`.

**Card styling (no change from slice 002):** `rounded-md border border-l-4 border-gray-200 bg-white p-3 text-sm`. Label: `font-semibold text-neutralDark`. Body: `text-xs text-gray-600 mt-0.5`. Right-aligned action: `text-xs font-semibold text-primary`.

---

## Generate + share action area

### Before generation (unchanged)

```
Expires  [         date input         ]   [Generate link]
```

- In-flight: `Generating…` (disabled).
- Error: `text-red-700 text-xs` — *"Couldn't generate portal link. Try again."*

### After generation — clipboard available (current slice)

```
✓ Link copied to clipboard.
[Copy again]   [Generate new]
```

### After generation — clipboard available (future slice, provider configured + contact present)

```
✓ Link copied to clipboard.
[Copy again]   [Send link]   [Generate new]
```

- `[Send link]` sits between `[Copy again]` and `[Generate new]`.
- Button style: `rounded-md bg-primary px-3 text-sm font-semibold text-white hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60` — same as the generate button.
- While sending: `Sending…` (disabled). On success: replaces with `✓ Sent` (1.5 s flash) then returns to `Send again`. On failure: inline error below the row.
- If `customerContact` is absent: button is **not rendered** (not disabled — absent). Admins with no contact saved never see a send affordance.

### After generation — clipboard unavailable (unchanged)

```
Link ready — copy it manually:
[url read-only field]  [Copy]
Paste this into an email or text to share with the customer.
```

No `[Send link]` in the clipboard-unavailable path — the manual copy affordance is the fallback; send is a separate action only available post-clipboard-copy.

### Session boundary notice (unchanged)

> *"This link is only available during this session. Reload the page and it's gone — generate a new one to reshare."*

`text-xs text-gray-400 italic mt-1`

---

## Token audit list

### Row structure (current slice — unchanged from slice 002)

```
┌──────────────────────────────────────────────────────────┐
│ ●  Active                          Created Apr 28        │
│    Expires May 31 · Never opened               [Revoke]  │
├──────────────────────────────────────────────────────────┤
│ ●  Active — no expiration          Created Apr 15        │
│    No expiration · Never opened                [Revoke]  │
├──────────────────────────────────────────────────────────┤
│ ○  Expired                         Created Apr 10        │
│    Expired Apr 25 · Never opened                         │
├──────────────────────────────────────────────────────────┤
│ ○  Revoked                         Created Apr 2         │
│    Revoked · Last opened Apr 8                           │
└──────────────────────────────────────────────────────────┘
```

### Row structure (future slice — send status + resend action)

Send status slots into line 2 as a third dot-separated segment. `[Resend]` appears right-aligned on line 2, before `[Revoke]`.

```
┌────────────────────────────────────────────────────────────────┐
│ ●  Active                              Created Apr 28          │
│    Expires May 31 · Opened May 1 · Sent May 1  [Resend] [Revoke] │
├────────────────────────────────────────────────────────────────┤
│ ●  Active                              Created Apr 28          │
│    Expires May 31 · Never opened · Not sent    [Send]  [Revoke] │
│    ⚠ Send failed May 2.                       [Retry]          │
└────────────────────────────────────────────────────────────────┘
```

**Send status segment copy (line 2, dot-separated after opened/never-opened):**
- Not sent yet: `Not sent`
- Sending: `Sending…`
- Sent: `Sent [date]`
- Sent via specific channel: `Sent [date] via email` / `Sent [date] via text`
- Failed: `Send failed` (triggers third line — see below)

**Send failure line (line 3 — only shown on failure):**
`text-xs font-semibold text-red-700 mt-1` — *"Send failed [date]. [Retry]"*
- `[Retry]` is a `<button type="button">`: `text-xs font-semibold text-primary hover:underline`
- The third line disappears once retry succeeds (send status updates to `Sent [date]`) or is dismissed.

**`[Send]` vs `[Resend]` copy:**
- `[Send]` — token has `not_sent` delivery status (no send attempt ever)
- `[Resend]` — token has `sent` or `failed` delivery status (at least one attempt made)
- Both: `rounded-md border border-gray-300 px-3 text-xs font-semibold text-neutralDark hover:bg-gray-50 min-h-9`

**Revoke confirmation (unchanged from current implementation):**
Inline `rounded-md border border-amber-200 bg-amber-50` group with `Revoke this link?` heading, context copy from `revokeConfirmPrompt()`, `[Cancel]` / `[Confirm revoke]`. Escape key cancels and returns focus to the Revoke button.

---

## State map

| State | Surface | Treatment |
|---|---|---|
| **Loading (token list)** | Readiness card + audit list | Card: "Loading portal status…" neutral border. List: 2 skeleton rows (`h-12 animate-pulse rounded bg-gray-100`). |
| **Empty (no tokens)** | Readiness card | "No portal links." Audit list hidden. |
| **Error (token list fetch)** | Readiness card | "Couldn't load portal links." + `[Retry]` → `tokensQuery.refetch()`. Audit list hidden. |
| **No active links** | Readiness card | "No active links." Audit list shown (expired/revoked rows only). |
| **Active, never opened** | Readiness card + row | Amber border; row line 2: "Never opened". |
| **Active, opened** | Readiness card + row | Emerald border; row line 2: "Opened [date]". |
| **Active — no expiration** | Row line 1 | Label: "Active — no expiration". Line 2: "No expiration · …". |
| **Multiple active** | Readiness card | "[N] active links" amber border. |
| **No contact saved** | Readiness card | "No contact saved" neutral border (only when no active-link state is dominant). |
| **Generated, clipboard available** | Action area | "✓ Link copied to clipboard." + `[Copy again]` + `[Generate new]`. (Future: + `[Send link]` if `providerReady && hasContact`.) |
| **Generated, clipboard unavailable** | Action area | Read-only URL field + `[Copy]` + helper text. No send affordance. |
| **Copied** | Action area button | `[Copy again]` flashes "Copied!" for 1.5 s then returns. |
| **Generating (in-flight)** | Generate button | "Generating…", disabled; date input disabled. |
| **Generate error** | Action area | `text-red-700 text-xs` below button: "Couldn't generate portal link. Try again." |
| **Revoke: idle** | Row | `[Revoke]` button enabled. |
| **Revoke: confirming** | Row | Inline amber confirm group; `[Revoke]` button hidden. |
| **Revoke: in-flight** | Row button | "Revoking…" (disabled); optimistic row update already applied via `useRevokeCustomerPortalAccessToken.onMutate`. |
| **Revoke: error** | Below list | `text-red-700 text-xs`: "Couldn't revoke link. Try again." Row reverts. |
| **Revoke: multiple in parallel** | Rows | Each row tracks its own `revokingId`; other rows remain enabled. |
| *(future)* **Provider not configured** | Send button | Button absent; not surfaced in readiness card — Codex concern at the provider boundary. |
| *(future)* **Provider blocked** | Send button area | "Send paused — provider unavailable." `text-xs text-amber-700` inline below button. |
| *(future)* **Missing contact** | Send button | Button absent when `!hasContact`. |
| *(future)* **Sending (in-flight)** | Send/Resend button | "Sending…" (disabled). |
| *(future)* **Sent** | Button flash + row | Button flashes "✓ Sent" for 1.5 s, returns to "Send again". Row line 2 gains "Sent [date]". |
| *(future)* **Send failed** | Row line 3 | "Send failed [date]." + `[Retry]` link. |
| *(future)* **Retryable** | Row line 3 | Same as Send failed — `[Retry]` triggers re-send mutation. |

---

## Copy bank

**Section:**
- `Portal access`
- `Generate links to share with this customer.`

**Readiness card labels:**
- `No portal links`
- `No active links`
- `Shared — not yet opened`
- `Customer has accessed the portal`
- `[N] active links` (N = integer)
- `No contact saved`
- `Loading portal status…`
- `Couldn't load portal links.`

**Readiness card body copy:**
- `Generate a link to share the customer portal.`
- `All previous links are expired or revoked.`
- `A portal link was shared but hasn't been opened.`
- `Last opened [date].`
- `Consider revoking older ones before sharing again.`
- `This customer has no email or phone on file. Share the link manually.`
- `Use retry to reload portal access history.`

**Generate + share action area:**
- `Generate link` / `Generating…`
- `Copy again` / `Copied!`
- `Generate new`
- `Copy`
- `✓ Link copied to clipboard.`
- `Link ready — copy it manually:`
- `Paste this into an email or text to share with the customer.`
- `This link is only available during this session. Reload the page and it's gone — generate a new one to reshare.`
- `Couldn't generate portal link. Try again.`
- *(future)* `Send link` / `Sending…` / `✓ Sent` / `Send again`

**Token row labels:**
- `Active` / `Active — no expiration` / `Expired` / `Revoked`
- `Created [date]`
- `Expires [date]` / `No expiration`
- `Expired [date]`
- `Opened [date]` / `Never opened`
- `Revoke` / `Revoking…`
- `Revoke this link?`
- `Cancel` / `Confirm revoke`
- *(future)* `Not sent` / `Sending…` / `Sent [date]` / `Sent [date] via email` / `Sent [date] via text` / `Send failed`
- *(future)* `Send` / `Resend` / `Retry`
- *(future)* `Send failed [date].`
- *(future)* `Send paused — provider unavailable.`

**Error messages:**
- `Couldn't revoke link. Try again.`
- `Couldn't generate portal link. Try again.`
- *(future)* `Couldn't send link. Try again.`

**Revoke confirm context copy (generated dynamically by `revokeConfirmPrompt()`):**
- `This link is active with no expiration and has never been opened.`
- `This link is active with no expiration — the customer has opened it.`
- `This link is active and expires [date]. It has never been opened.`
- `This link is active and expires [date]. The customer last opened it [date].`

---

## Layout notes

**Contact readiness:**
- `CustomerPortalLinks` signature gains: `customerContact?: { phone: string | null; email: string | null }`
- Derives: `const hasContact = Boolean(customerContact?.phone || customerContact?.email)`
- `hasContact` feeds the readiness card (no-contact state) and future send-button visibility
- No new API call; `customers-client.tsx` passes `customerContact={{ phone: customer.phone, email: customer.email }}` at the existing call site (line 611)

**Send/resend button placement (future):**
- Post-generation, clipboard-available row: `flex gap-2 sm:flex-row sm:items-center`. Button order: `[Copy again]` → `[Send link]` → `[Generate new]`. `[Send link]` uses same primary style as `Generate link`.
- Token row: right-aligned button group `flex shrink-0 gap-2`. Order: `[Send]` or `[Resend]` → `[Revoke]`. Both at `text-xs`. Send/Resend: `border border-gray-300 text-neutralDark`. Revoke: `border border-red-200 text-red-700 hover:bg-red-50` (unchanged).

**Send status in row line 2:**
- Appended as a dot-separated segment: `{tokenExpiryText(token)} · {formatOpened(token.last_used_at)} · {sendStatusText(token)}`
- `sendStatusText()` would live in `customer-portal-links.tsx` as a local helper (display concern over a future field, not domain logic)
- When send status is absent (current slice), the segment is simply omitted — no dot, no empty string

**Send failure line 3:**
- `mt-1 flex items-center gap-2`
- Status text: `text-xs font-semibold text-red-700`
- Retry: `<button type="button" className="text-xs font-semibold text-primary hover:underline">Retry</button>`

**Existing patterns unchanged:**
- Readiness card: `rounded-md border border-l-4 border-gray-200 bg-white p-3 text-sm`
- Action area container: `flex flex-col gap-2 sm:flex-row sm:items-end`
- Read-only URL input: `flex-1 rounded-md border border-gray-300 px-3 py-2 text-xs font-mono text-neutralDark bg-gray-50 outline-none` + `readOnly` + `onFocus={(e) => e.target.select()}`
- Audit list container: `divide-y divide-gray-100 rounded-md border border-gray-200 bg-gray-50`
- Row: `px-3 py-2`
- Skeleton rows: `h-12 animate-pulse rounded bg-gray-100`

---

## AGENTS conformance self-check

| Concern | Plan | Status |
|---|---|---|
| **No direct Supabase from UI** | All data through `useCustomerPortalAccessTokens`, `useCreateCustomerPortalAccessToken`, `useRevokeCustomerPortalAccessToken` — unchanged. Future send uses a new hook over a server route, not a direct Supabase call. | ✅ |
| **Business logic in `packages/domain`** | Token state derivation stays in `getCustomerPortalAccessTokenState`, `getCustomerPortalAccessTokenReadiness`, `getCustomerPortalAccessTokenReadinessSummary` (all in `packages/domain/closeouts.ts`). Contact readiness is a display concern (`hasContact` one-liner in the component). Send status text is a local helper — not moved to domain since there is no domain model for send events yet. | ✅ |
| **No schema changes** | `CustomerPortalAccessTokenSummary` fields sufficient for all current states. Future send status fields deferred to the provider route slice. | ✅ |
| **No raw token persistence** | `latestLink` stays in React `useState` — never written to localStorage, sessionStorage, or server. | ✅ |
| **No automatic sending** | `[Send link]` and `[Resend]` buttons are not rendered in this slice. Placement and copy are documented here for future use only. No provider calls anywhere in this proposal. | ✅ |
| **No service-role, token hash, or internal field exposure** | Token rows surface only `status`, `expires_at`, `last_used_at`, `created_at`. `token_hash` and `created_by` never shown. | ✅ |
| **No provider setup, secrets, or dashboard changes** | `customerContact` prop derived from existing `Customer` type (`packages/types/index.ts`). No new env vars, no provider config surfaced. | ✅ |
| **No migrations, RLS changes, or new secrets** | Zero infra changes. | ✅ |
| **Customer-safe portal boundary preserved** | Token generation remains server-enforced. No customer id → authorization shortcut. | ✅ |

---

## Open questions for Codex

1. **`customerContact` prop vs. hook.** The cleanest path is a new optional `customerContact` prop on `CustomerPortalLinks` — no extra query, data already in scope at the call site in `customers-client.tsx` (line 611). Confirm this is acceptable, or specify if contact should be fetched inside the component instead.

2. **Provider readiness signal.** When send/resend is implemented, how should the UI know a provider is configured? Options: (a) a boolean prop `providerReady` passed from a server component; (b) a `/api/portal/send-readiness` endpoint; (c) a feature flag. Recommend (a) for simplicity — the server component rendering `customers-client.tsx` can include it alongside the customer record.

3. **Send scope.** The copy bank includes "via email" and "via text" variants for sent status. Will the provider route deliver to email, phone, or both? If both, is there a preference order? Copy can be simplified to `Sent [date]` with no channel label if the channel is always the same.

4. **Send history persistence.** The state map assumes send outcomes (sent date, failure) are persisted on the token record or a related table. If send outcomes are session-only, the token row send-status segment is omitted after page reload — acceptable for V1, but admins lose visibility into prior sends. Codex should decide before implementing the send route.

5. **Resend throttle.** No cooldown is modelled here. If Codex wants to prevent rapid resends (e.g., block `[Resend]` for 60 s after a successful send), add a `lastSentAt` field to the token summary and disable the button client-side with a countdown. Out of scope for this slice.

6. **`[Send]` vs `[Resend]` on token rows.** The distinction rests on whether any send has been attempted. If send history isn't persisted (see Q4), all active rows show `[Send]` regardless of prior attempts — fine for V1, but confirm the expected label.

7. **Contact missing + provider configured.** Should the readiness card show "No contact saved" only when the provider is configured (to avoid surfacing a concern that isn't yet actionable)? Currently proposed as always-visible when dominant — if the provider route is far off, Codex may prefer to suppress it until `providerReady` is true.

---

## Follow-up ideas (out of scope, noted per the brief)

- **Automated email/SMS delivery.** Once a provider-approved server route exists (e.g., `POST /api/portal/send`), `[Send link]` and `[Resend]` render against that route. The session link from `latestLink` pre-fills the send payload — no token re-fetch needed. `useCustomerPortalAccessTokens` query invalidation after send would update the row's send status if persistence is added.
- **Delivery status polling.** If the provider route is async (webhook confirmation), the row could poll for delivery confirmation using a `useQuery` with `refetchInterval`. Schema change needed for a `delivery_status` column — V2+.
- **No-expiration send warning.** Before sending a link with no expiry, surface a brief inline note: *"This link has no expiration — the customer can access it indefinitely."* Deferred.
- **Send-all for re-engagement.** Bulk `[Resend to all]` for offices wanting to nudge customers who never opened their portal link. Needs multi-send server route — V2+.
- **Contact edit shortcut.** From the "No contact saved" card state, a direct link to the customer's edit form would remove the friction of navigating away. No schema change; UI convenience only.
