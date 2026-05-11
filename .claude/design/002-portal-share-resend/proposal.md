# Proposal: Portal Share / Resend V1

## Goal & non-goals

- **Goal:** Office users open a customer detail panel and immediately see *is this customer ready to share the portal, which link is safe to share right now, whether the customer has opened it, and what to do next* — without any schema changes, email/SMS setup, or new provider config.
- **Non-goals:** automatic sending, schema or RLS changes, persisting raw tokens beyond the current page session, email/SMS templates, customer-facing portal redesign.

## Approach

Re-organise `CustomerPortalLinks` into three distinct zones, stacked vertically in the existing customer detail panel:

1. **Share readiness card** — one-card, state-driven summary that answers "what should I do next?" Mirrors the "next action" card from the billing work queue slice.
2. **Generate + share action area** — expiry date input, primary generate button, and a session-scoped copy/share affordance that appears immediately after generation.
3. **Token audit list** — compressed, dense rows (one per token) for the full audit trail with per-row revoke.

No new pages, no new routes, no new hooks beyond what already exists. All business logic lives in `packages/domain/closeouts.ts` helpers already exported.

---

## Information hierarchy — `CustomerPortalLinks`

```
┌─────────────────────────────────────────────────────────┐
│  Portal access                             [section h3]  │
│  Generate links to share with this customer.  [subtitle] │
├─────────────────────────────────────────────────────────┤
│  SHARE READINESS CARD  (state-driven, see table below)  │
├─────────────────────────────────────────────────────────┤
│  GENERATE + SHARE ACTION AREA                           │
│  Expires [date input]   [Generate link ▶]               │
│  ── post-generation (session only) ─────────────────── │
│  [Copy link]  or  [url read-only field] + [Copy]        │
│  "Copied to clipboard" / "Clipboard unavailable"        │
├─────────────────────────────────────────────────────────┤
│  TOKEN AUDIT LIST  (dense rows, newest first)           │
│  ┌──────────────────────────────────────────────────┐  │
│  │ ● Active  Created Apr 28 · Expires May 31        │  │
│  │   Last opened May 1                    [Revoke]  │  │
│  ├──────────────────────────────────────────────────┤  │
│  │ ○ Expired  Created Apr 10 · Expired Apr 25       │  │
│  │   Never opened                                   │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## Share readiness card

One card, state-driven, exactly one primary action signal. Answers all five user questions in ≤2 lines.

| Condition | Status label | Body copy | Action signal |
|---|---|---|---|
| No tokens at all | **No portal links** | *"Generate a link to share the customer portal."* | → Generate link (scroll-focus the action area) |
| Active link, never opened | **Shared — not yet opened** | *"A portal link was sent but hasn't been opened."* | → [Copy link] if session, else [Generate new link] |
| Active link, opened | **Customer has accessed the portal** | *"Last opened [date]."* | → [Generate new link] (secondary) |
| Active links, multiple (>1) | **[N] active links** | *"Consider revoking older ones before sharing again."* | → [Generate new link] (secondary) |
| No active links (all expired/revoked) | **No active links** | *"All previous links are expired or revoked."* | → [Generate new link] |
| Loading | — | *"Loading portal status…"* | — |
| Error (token list fetch) | — | *"Couldn't load portal links."* + [Retry] | — |

The readiness card uses the existing `getCustomerPortalAccessTokenReadinessSummary()` and `getCustomerPortalAccessTokenState()` helpers — no new domain logic needed.

**Card styling:** `rounded-md border p-3 text-sm` with a left-border accent by status:
- Active + opened: `border-l-4 border-l-emerald-500` (success)
- Active + never opened: `border-l-4 border-l-amber-400` (warning/attention)
- No active links / no tokens: `border-l-4 border-l-gray-300` (neutral)

---

## Generate + share action area

**Before generation (default):**
```
Expires  [         date input         ]   [Generate link]
```
- Expiry field: optional, same `<input type="date">` as current.
- `Generate link` → primary button, full-width on mobile, inline on sm+.
- In-flight: `Generating…` (disabled).
- Error (mutation): inline `text-red-700 text-xs` below the button: *"Couldn't generate portal link. Try again."*

**After generation — clipboard available (happy path):**
```
✓ Link copied to clipboard.         [Copy again]   [Generate new]
```
- Confirm message: small `text-xs font-semibold text-accent` (matches existing `message` pattern).
- `Copy again` → secondary outlined button; on click shows `Copied!` for 1.5 s then returns.
- `Generate new` → tertiary text link; resets the session link state, scrolls back to the date input.

**After generation — clipboard unavailable (fallback):**
```
Link ready — copy it manually:
┌─────────────────────────────────────────┐ [Copy]
│ https://app.pestpatrol.com/portal/…    │
└─────────────────────────────────────────┘
Paste this into an email or text to share with the customer.
```
- Read-only `<input>` (not `<textarea>`) with full URL visible; `select()` on focus.
- `Copy` button attempts clipboard again; shows `Copied!` on success, stays shown on second failure.
- Helper text: `text-xs text-gray-500` — *"Paste this into an email or text to share with the customer."*
- This is the "manual resend" affordance: no provider required, admin copies and pastes.

**Session boundary notice** (shown whenever `latestLink` is present):
> *"This link is only available during this session. Reload the page and it's gone — generate a new one to reshare."*
- `text-xs text-gray-400 mt-1 italic` — informational, not alarming.

---

## Token audit list

Dense rows, newest-first. Target height: ~56 px per row.

```
┌──────────────────────────────────────────────────────────┐
│ ●  Active                           Created Apr 28       │
│    Expires May 31 · Opened May 1               [Revoke]  │
├──────────────────────────────────────────────────────────┤
│ ○  Active — no expiration           Created Apr 15       │
│    Never opened                                [Revoke]  │
├──────────────────────────────────────────────────────────┤
│ ○  Expired                          Created Apr 10       │
│    Expired Apr 25 · Never opened                         │
├──────────────────────────────────────────────────────────┤
│ ○  Revoked                          Created Apr 2        │
│    Revoked · Last opened Apr 8                           │
└──────────────────────────────────────────────────────────┘
```

**Row structure:**
- Line 1: State dot + state label (left) · Created date (right) — both `text-xs font-semibold`
- Line 2: Expiry/no-expiration · Last opened or "Never opened" (left) · `[Revoke]` if active (right)
- No label duplication; the "State" label row from the current implementation is dropped (redundant with the dot + text).

**State dots:**
- `● text-emerald-600` — active
- `○ text-gray-400` — expired or revoked

**Date format:** `MMM D` for same year, `MMM D, YYYY` if prior year. Use `Intl.DateTimeFormat` (already in the component).

**Revoke flow:**
1. Click `Revoke` → button changes to `Revoking…` (disabled) while optimistic update fires immediately (already implemented).
2. Row immediately shows as revoked state (optimistic).
3. On error: reverts + inline `text-red-700 text-xs` below the list: *"Couldn't revoke link. Try again."*
4. No confirmation dialog for V1 — revoke is recoverable by generating a new link, and the office context is low-risk. (Flag for V2 if needed.)

**Empty state:** `<p class="text-xs text-gray-500">No portal links generated</p>` — same as current.

**Loading state:** 2 skeleton rows (`animate-pulse rounded bg-gray-100 h-12`) instead of the plain text spinner.

---

## State map

| State | Where | Treatment |
|---|---|---|
| **Loading (token list)** | Readiness card + audit list | Card shows "Loading portal status…" skeleton; list shows 2 skeleton rows. |
| **Empty (no tokens)** | Readiness card | "No portal links" state per table above. Audit list hidden. |
| **Error (token list fetch)** | Readiness card | Inline error: *"Couldn't load portal links."* + `Retry`. Audit list hidden. |
| **Generated, clipboard available** | Action area | Confirm + "Copy again" + "Generate new". |
| **Generated, clipboard unavailable** | Action area | Read-only URL field + "Copy" button + helper text. |
| **Copied** | Action area | Button flashes "Copied!" for 1.5 s then returns to "Copy again". |
| **Generating (in flight)** | Generate button | `Generating…`, disabled; date input also disabled. |
| **Generate error** | Action area | `text-red-700 text-xs` below button: *"Couldn't generate portal link. Try again."* |
| **Active, never opened** | Readiness card + row | Warning border-left; row line 2: "Never opened". |
| **Active, opened** | Readiness card + row | Success border-left; row line 2: "Opened [date]". |
| **Active, no expiration** | Row | Line 2 prefix: "No expiration · …". |
| **Expired** | Row | Dim dot; line 1: "Expired"; line 2: "Expired [date]". |
| **Revoked** | Row | Dim dot; line 1: "Revoked"; [Revoke] button absent. |
| **Revoke in flight** | Row button | `Revoking…`, disabled; optimistic row update fires immediately. |
| **Revoke error** | Below list | Inline `text-red-700 text-xs`: *"Couldn't revoke link. Try again."* Row reverts. |
| **Revoke pending (multiple)** | Row | Only one `Revoking…` button active at a time; others remain enabled (existing `revokeToken.isPending` is per-mutation). |

---

## Copy bank

**Section title:** `Portal access`
**Section subtitle:** `Generate links to share the customer portal.`

**Readiness card labels:**
- `No portal links`
- `Shared — not yet opened`
- `Customer has accessed the portal`
- `[N] active links`
- `No active links`
- `Loading portal status…`
- `Couldn't load portal links.`

**Action area:**
- `Generate link` / `Generating…`
- `Copy again` / `Copied!`
- `Generate new`
- `Copy`
- `✓ Link copied to clipboard.`
- `Link ready — copy it manually:`
- `Paste this into an email or text to share with the customer.`
- `This link is only available during this session. Reload the page and it's gone — generate a new one to reshare.`
- `Couldn't generate portal link. Try again.`

**Token row labels:**
- `Active` / `Active — no expiration` / `Expired` / `Revoked`
- `Created [date]`
- `Expires [date]` / `No expiration`
- `Opened [date]` / `Never opened`
- `Revoke` / `Revoking…`

**Error messages:**
- `Couldn't revoke link. Try again.`
- `Couldn't generate portal link. Try again.`

**Input label:** `Expires` (keep current)

---

## Layout notes (Next / Tailwind, existing patterns)

- **Readiness card:** `rounded-md border border-gray-200 bg-white p-3 text-sm mt-3` + `border-l-4` accent for status. Single-line status label `font-semibold text-neutralDark`, one-line body `text-xs text-gray-600 mt-0.5`, right-aligned action link `text-xs font-semibold text-primary`.
- **Action area:** keep the existing `flex flex-col gap-2 sm:flex-row sm:items-end` pattern. Read-only URL input: `flex-1 rounded-md border border-gray-300 px-3 py-2 text-xs font-mono text-neutralDark bg-gray-50 outline-none` with `readOnly` and `onFocus={(e) => e.target.select()}`.
- **Session notice:** `text-xs text-gray-400 italic mt-1` — no border, no icon. Low visual weight.
- **Audit rows:** `divide-y divide-gray-100` list (no gap between rows), each row `flex items-center justify-between px-3 py-2`. State dot as `inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle` colored by state.
- **Skeleton rows:** `h-12 rounded bg-gray-100 animate-pulse` — two of them, `flex flex-col gap-2 mt-3`.
- **Revoke button:** existing `border border-red-200 text-red-700 hover:bg-red-50` — keep as-is.
- **Copy again / Generate new:** `rounded-md border border-gray-300 px-3 text-sm font-semibold text-neutralDark hover:bg-gray-50` (secondary) and `text-sm font-semibold text-primary hover:underline` (text link) respectively.

---

## AGENTS conformance self-check

| Concern | Plan | Status |
|---|---|---|
| **No direct Supabase from UI** | All data through `useCustomerPortalAccessTokens`, `useCreateCustomerPortalAccessToken`, `useRevokeCustomerPortalAccessToken` — no change to hook architecture. | ✅ |
| **Business logic in `packages/domain`** | `getCustomerPortalAccessTokenState`, `getCustomerPortalAccessTokenReadiness`, `getCustomerPortalAccessTokenReadinessSummary` already exported from domain. Readiness card logic is pure derivation — no new domain helpers needed. | ✅ |
| **No schema changes** | Token summary fields (`status`, `expires_at`, `last_used_at`, `created_at`) already sufficient for every state. | ✅ |
| **No raw token persistence** | `latestLink` stays in React component state (`useState`). Never written to localStorage, sessionStorage, or any server. Gone on unmount/reload. | ✅ |
| **No automatic sending** | "Manual resend" = copy-to-clipboard affordance. No provider calls. | ✅ |
| **No service-role, token hash, internal note exposure** | Audit rows display only `status`, `expires_at`, `last_used_at`, `created_at` — same as current. Token hash (`token_hash`) never surfaced. | ✅ |
| **Customer-safe portal boundary preserved** | No customer id → authorization shortcut. Token generation remains server-enforced. | ✅ |
| **No migrations, RLS changes, new secrets** | Zero infra changes. | ✅ |

---

## Open questions for Codex

1. **Revoke confirmation.** Current implementation fires immediately with an optimistic update. Low-risk for V1 given office context, but worth confirming: should revoke require a `window.confirm` or an inline "Are you sure?" step? Recommend deferring to V2.
2. **Multiple active links.** The readiness card flags >1 active link as notable. Is there a business rule (e.g. max 1 active link) that Codex wants to enforce at the API layer? If so, the card copy can be simplified to not show the multi-link case.
3. **Newest-first sort.** Audit list sorted by `created_at` descending — confirm this is the right default (most-recently-generated on top, which is the one most likely to share).
4. **No-expiration warning.** A link with no expiry and `last_used_at = null` is the highest-risk token (active forever, never confirmed opened). Should the readiness card treat this as a distinct "attention" state? Currently it falls into "Shared — not yet opened." Worth Codex confirming whether ops staff need a stronger visual cue.
5. **Session notice copy.** The "this link is only available this session" notice may surprise office users the first time. Consider a one-time dismissible callout vs. always-on small text. Always-on is simpler; one-time requires localStorage (which is acceptable here since it's a UI preference, not a token).

---

## Follow-up ideas (out of scope, noted per the brief)

- **Email/SMS send.** Once a provider-approved server route exists, the "manual share" copy affordance drops in as a pre-fill source for the message body. The session link flows naturally into it.
- **Token expiry nudge.** If an active link is within 48 h of expiration and never opened, surface a yellow callout in the readiness card: *"This link expires soon — resend before it lapses."* Needs no schema change; derived from `expires_at`.
- **Revoke-all.** Bulk `Revoke all active` action for high-volume offices managing customers with many stale links. Out of scope until the multi-link case is validated.
- **Portal-opened event log.** The `last_used_at` field is a single timestamp; there's no per-access audit trail. A lightweight server log (append-only) would let admins see "opened 3 times" vs "opened once." Schema change needed — V2+.
- **Customer detail "portal ready" badge.** Small inline chip on the customer list row (e.g. `Portal: active` / `Portal: none`) so admins can spot at a glance which customers have been portal-enabled. No schema change — derived from the same token query.
