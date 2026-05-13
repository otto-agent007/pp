# Proposal: Portal Token Audit Events V1

## Goal & non-goals

- **Goal:** Specify the UI hierarchy, event taxonomy, and interaction states for a future persistent per-token audit timeline on `/customers` → `CustomerPortalLinks`. Admins should be able to see — for any given token — when it was generated, copied or manually shared (when knowable), opened by the customer, revoked, expired, and any future send-attempt outcomes, without crowding the existing dense token rows or surfacing service-role/raw-token data.
- **Non-goals:** implementing the audit event table, RLS, API routes, event writes, or any provider-backed delivery in this slice; persisting raw portal URLs or clipboard values; changing token authorization, hashing, expiration, or revoke behavior; new customer contact fields; mobile offline behavior; redesigning the customer-facing portal; introducing the `Send`/`Resend` buttons themselves (slice 006 owns that boundary, this slice defines only the *event* surface their outcomes feed into).

---

## Approach

`CustomerPortalLinks` (`apps/web/app/customers/customer-portal-links.tsx`) is already organised into three zones from slices 002 and 006: readiness card → generate/share action area → dense token audit list. This slice adds a fourth zone *inside* each token row — an opt-in expanded "event history" drawer — and defines the event taxonomy that future Codex work would emit and surface.

Three targeted additions:

1. **Per-row expand affordance** — each token row gains a small `▾ History` chevron toggle on the right side of line 2 (next to `[Revoke]` when present). Toggling expands an inline event timeline below the row. Default state is collapsed; expansion is one-row-at-a-time per `CustomerPortalLinks` instance.

2. **Per-token event timeline** — a tight list of timestamped events specific to that token, server-persisted, customer-safe. Distinguishes persisted server events (e.g., `Opened`) from session-only UI feedback (`Copied!` flash) by *never* surfacing the latter in the timeline — clipboard interactions are session UX only, never logged.

3. **Event taxonomy + copy bank** — exhaustive list of every event the future schema needs to surface, with admin-facing labels, body copy, actor/channel metadata shape, and per-event icon/color, so Codex can map a row-per-event table directly to the UI without copy decisions at implementation time.

No new pages, no new routes, no domain/schema changes in this slice. All data flow stays inside the existing `useCustomerPortalAccessTokens` + future `useCustomerPortalAccessTokenEvents(tokenId)` hook (defined here, not implemented in this slice).

---

## Information hierarchy — `CustomerPortalLinks`

### Collapsed (default — current behavior preserved)

```
┌────────────────────────────────────────────────────────────────┐
│  Portal access                                  [section h3]   │
│  Generate links to share with this customer.    [subtitle]     │
├────────────────────────────────────────────────────────────────┤
│  SHARE READINESS CARD          (unchanged — slices 002/006)    │
├────────────────────────────────────────────────────────────────┤
│  GENERATE + SHARE ACTION AREA  (unchanged — slices 002/006)    │
├────────────────────────────────────────────────────────────────┤
│  TOKEN AUDIT LIST                                              │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ ●  Active                          Created Apr 28        │  │
│  │    Expires May 31 · Opened May 1     ▾ History  [Revoke] │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │ ○  Expired                         Created Apr 10        │  │
│  │    Expired Apr 25 · Never opened     ▾ History           │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

### Expanded (one row open)

```
┌────────────────────────────────────────────────────────────────┐
│ ●  Active                            Created Apr 28            │
│    Expires May 31 · Opened May 1       ▴ Hide history [Revoke] │
│    ┌──────────────────────────────────────────────────────┐    │
│    │ ● May 1, 9:14 AM   Opened by customer                │    │
│    │                    via portal link                   │    │
│    │ ● Apr 28, 4:02 PM  Manually shared                   │    │
│    │                    by Otto Mendez                    │    │
│    │ ● Apr 28, 4:02 PM  Link copied                       │    │
│    │                    by Otto Mendez                    │    │
│    │ ● Apr 28, 4:01 PM  Link generated                    │    │
│    │                    by Otto Mendez · expires May 31   │    │
│    └──────────────────────────────────────────────────────┘    │
└────────────────────────────────────────────────────────────────┘
```

The timeline is contained inside the token row's existing border — no separate card, no extra heading — keeping the audit list's dense feel intact while making history opt-in.

---

## Event taxonomy

Ten event types, all persisted on the server side of the future implementation. Every event has a `kind`, `occurred_at`, optional `actor` (admin user id or `null` for customer/system), and optional `metadata` JSONB scoped to the event kind. **Token hash, raw URL, provider secrets, webhook payloads, and internal notes are NEVER surfaced.** Metadata is whitelisted to the fields named here.

| `kind` | Trigger | Actor | Customer-safe metadata | Persisted? |
|---|---|---|---|---|
| `generated` | Successful `POST /api/portal/access-tokens` | admin user | `expires_at`, `has_expiration` | yes |
| `copied` | Admin clicks `Copy` or `Copy again` and `navigator.clipboard.writeText` resolves | admin user | none | yes (server write fires from a future `/copied` route — never from raw clipboard contents) |
| `manually_shared` | Admin uses a future explicit "I shared this" affordance (out of scope for current slice — placeholder for completeness) | admin user | optional `channel: "email" \| "text" \| "other"` | yes |
| `opened` | Customer hits the tokened portal route with a valid token | `null` (customer) | none — no IP, no UA | yes (derived from existing `last_used_at` writes; this slice just visualises them as discrete events) |
| `revoked` | Successful `POST /api/portal/access-tokens/{id}/revoke` | admin user | none | yes |
| `expired` | First server-observed access attempt after `expires_at` *or* a daily sweep job's first detection | `null` (system) | none | yes |
| `send_attempted` | Future provider-route invocation begins | admin user | `channel: "email" \| "text"` | yes (future slice) |
| `send_succeeded` | Provider acknowledged delivery (or webhook confirmed) | admin user | `channel`, optional `provider_message_id_redacted: boolean` | yes (future slice) |
| `send_failed` | Provider returned a delivery error | admin user | `channel`, `reason: "invalid_address" \| "provider_error" \| "rate_limited" \| "blocked"` | yes (future slice) |
| `provider_blocked` | Future delivery attempt rejected because the customer or address is on a block list | admin user | `channel`, `reason: "unsubscribed" \| "bounced" \| "complaint"` | yes (future slice) |

**Why each kind matters in admin UX:**
- `generated` anchors the timeline (every token has exactly one).
- `copied` lets admins reconcile "did I actually copy that link, or did I forget?" — useful when a customer claims they never got it.
- `manually_shared` exists for offices that want a "mark as shared" affordance distinct from `copied`. Out of scope to *render the trigger button* in this slice, but the event surface must support it.
- `opened` is the highest-value confirmation event.
- `revoked` / `expired` close the lifecycle.
- `send_*` and `provider_blocked` lay the contract for slice 006's deferred provider-backed sends.

**Session-only feedback that is NOT an event:**
- The transient "Copied!" button flash (`copyFlash` state in `customer-portal-links.tsx`, line 130) is *display feedback for the current admin's clipboard write attempt*. The persisted `copied` event fires only after the write resolves successfully and the client posts to a future `/api/portal/access-tokens/{id}/events/copied` route. If clipboard fails (`copyUnavailable`), no `copied` event is persisted.
- Generate-button hover, expand/collapse chevron toggles, retry button clicks, and any other in-component UX state never become events.

---

## Per-row expand affordance

**Location:** right side of line 2, immediately to the left of `[Revoke]` (or alone on revoked/expired rows).

**Affordance:**
- Collapsed: `▾ History` — small text button, `text-xs font-semibold text-primary hover:underline min-h-9 px-1`.
- Expanded: `▴ Hide history` — same style, rotated chevron.
- Keyboard: standard `<button type="button">` semantics; Enter/Space toggle; focus ring inherited from existing button base.
- ARIA: `aria-expanded={isExpanded}`, `aria-controls={timelineId}`. The timeline `<div>` gets `id={timelineId}` and `role="region"` with `aria-label="Event history for portal link created [date]"`.

**Single-row policy:** Only one row's history is open at a time per `CustomerPortalLinks` instance. Opening row B closes row A. This keeps the audit list compact and avoids unbounded vertical growth when a customer has many tokens.

**State:** new `useState<string | null>(null)` holding `expandedTokenId`. Set to the token's `id` on expand; clear on collapse. Lives in the component, not the URL — refresh resets to collapsed.

---

## Timeline — section-by-section

### Container

```html
<div
  role="region"
  aria-label="Event history for portal link created Apr 28"
  className="mt-2 rounded-md border border-gray-200 bg-white px-3 py-2"
>
  ...timeline items...
</div>
```

- Sits inline below the existing row content, indented by the same `px-3` so it visually belongs to the row.
- White background distinguishes it from the audit list's `bg-gray-50` surface (events feel like a separate "drill-in" surface, not another row).
- No nested borders, no shadows — minimal weight, dense data.

### Timeline item

```
● May 1, 9:14 AM   Opened by customer
                   via portal link
```

- Two-column flex: `flex gap-3 py-1`.
- Left: event dot, `inline-block h-1.5 w-1.5 rounded-full mt-1.5 shrink-0` — color by event kind (see below).
- Right: stacked text block — line 1 timestamp + label, line 2 (optional) body copy with actor/metadata.

**Line 1 (timestamp + label):**
- Timestamp: `text-xs font-semibold text-gray-500` — `Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" })`.
- Label: `text-xs font-semibold text-neutralDark ml-2`.

**Line 2 (body — optional, kind-dependent):**
- `text-xs text-gray-500 mt-0.5`
- Shape: `by [actor] · [metadata bits]` for admin-actor events; `via portal link` / `system` for non-admin events.
- Examples:
  - `Link generated` → `by Otto Mendez · expires May 31`
  - `Link generated` (no expiry) → `by Otto Mendez · no expiration`
  - `Link copied` → `by Otto Mendez`
  - `Manually shared` → `by Otto Mendez · via email` (or `· via text`, `· via other`, or just `by Otto Mendez` if `channel` is null)
  - `Opened by customer` → `via portal link`
  - `Revoked` → `by Otto Mendez`
  - `Expired` → `system`
  - `Send attempted` → `by Otto Mendez · via email`
  - `Send succeeded` → `by Otto Mendez · via email`
  - `Send failed` → `by Otto Mendez · via email · invalid address`
  - `Provider blocked` → `by Otto Mendez · via email · unsubscribed`

**Actor display:** the future API returns a denormalised `actor_display_name` string (admin first + last, or admin email if no name). The component never receives `created_by` user IDs directly — that work belongs server-side. If `actor_display_name` is null, render `by an admin` rather than exposing a raw id.

### Event dot colours

| Kind | Dot |
|---|---|
| `generated` | `bg-emerald-600` |
| `copied` | `bg-gray-400` |
| `manually_shared` | `bg-gray-400` |
| `opened` | `bg-emerald-600` |
| `revoked` | `bg-red-500` |
| `expired` | `bg-gray-400` |
| `send_attempted` | `bg-gray-400` |
| `send_succeeded` | `bg-emerald-600` |
| `send_failed` | `bg-red-500` |
| `provider_blocked` | `bg-amber-500` |

Three colour buckets: green = positive lifecycle event (created, opened, delivered), red = terminal/negative (revoked, send failed), grey = neutral/utility, amber = soft warning (blocked but recoverable).

### Ordering

Newest first. Sort key: `occurred_at DESC`. Ties broken by event kind in lifecycle order (`generated` is the floor — never above an `opened` of the same instant).

---

## Collapsed-row info preservation

The existing dense row already conveys the *latest* state at a glance — `Active`, `Expires May 31`, `Opened May 1`, `Revoked`. The timeline is for *historical* events. To avoid duplication:

- The row's line 2 continues to surface the dominant lifecycle fact (`Opened May 1` / `Never opened`, `Expires May 31` / `Expired Apr 25`) from existing `CustomerPortalAccessTokenSummary` fields.
- The timeline shows *every* event, including the latest, but the row's summary is the canonical "what's the current state" answer.
- If future send/resend status lands (slice 006), the row's line 2 picks up the dot-separated `Sent [date]` segment as defined there; the timeline shows the full `send_attempted` / `send_succeeded` / `send_failed` sequence.

**One exception worth surfacing on the collapsed row:** a recent `send_failed` or `provider_blocked` for an active token. This is high-signal information the admin shouldn't have to expand to see. Slice 006 already specifies a line-3 failure callout — this slice confirms that callout maps to the latest `send_failed` event and the line-3 `[Retry]` button corresponds to a fresh `send_attempted` event being emitted.

---

## State map

| State | Surface | Treatment |
|---|---|---|
| **Collapsed (default)** | Token row | `▾ History` button visible; no timeline rendered. |
| **Expanding (in flight)** | Timeline container | `<div className="mt-2 rounded-md border border-gray-200 bg-white px-3 py-2">` with 3 skeleton items (`h-3 w-32 animate-pulse rounded bg-gray-100` for label, `h-3 w-24 mt-1 animate-pulse rounded bg-gray-100` for body). |
| **Loaded — events present** | Timeline | Newest-first list of events; each item per spec above. |
| **Loaded — empty (no events)** | Timeline | `<p className="text-xs text-gray-500 italic">No recorded history yet.</p>` — possible only if the future events table hasn't persisted anything for the token (e.g., pre-existing tokens from before audit events shipped). |
| **Loaded — partial history** | Timeline | Render whatever events are present; append a footer note: `<p className="mt-2 text-xs italic text-gray-400">History before [earliest occurred_at] isn't recorded.</p>`. Only shown when the server response indicates a truncation cutoff (see "Partial-history signal" below). |
| **Error (events fetch)** | Timeline | `<p className="text-xs font-semibold text-red-700">Couldn't load history.</p>` + inline `[Retry]` link (`text-xs font-semibold text-primary hover:underline`). On retry, return to the expanding state and refetch. |
| **Stale while refetching** | Timeline | Existing events stay visible, no skeleton flash; React Query's `isFetching && !isLoading` path. No extra UI. |
| **Token revoked while history open** | Timeline | New `revoked` event appears at the top of the timeline on the next React Query invalidation; no manual reload needed. |
| **Server-truncated history (e.g., retention cap)** | Timeline footer | Render the partial-history footer per above. |
| **Loading the audit list itself** | Audit list (existing) | Existing 2 skeleton rows from slice 002 — unchanged. Timeline is not rendered for skeleton rows. |

### Partial-history signal

The future events endpoint returns `{ events: TokenEvent[], truncated_before?: string | null }`. If `truncated_before` is non-null, the UI renders the partial-history footer with that ISO date formatted as `MMM D, YYYY`. This preserves admin trust by signalling "yes there were earlier events but they're outside the retention window" instead of silently dropping them.

If `truncated_before` is null/undefined, the timeline is treated as complete and no footer renders.

---

## Distinguishing persisted vs session-only feedback

The audit timeline contains **only** server-persisted events. The component preserves two existing session-only UX signals that must NOT be conflated with events:

| Session signal | Where | Lifetime | Persisted? |
|---|---|---|---|
| `copyFlash` (button "Copied!") | Action area, post-generation | 1.5s flash | No — display only |
| `message` ("✓ Link copied to clipboard.") | Action area | Until next clipboard attempt or `resetLatestLink` | No — display only |
| `latestLink` (raw URL in session) | Action area, post-generation | React state only | No — raw URL never logged |
| Revoke confirmation amber card | Token row | Until cancel/confirm | No — modal-equivalent UX |

The audit timeline never reflects these. Persisted events are visually anchored by the dot column and the timestamp on the left; session signals all live in the action area above the audit list, with their own visual styling (no dots, no timestamp). The split is enforced by location and by the fact that session signals never have an `occurred_at`.

---

## V1 reduced timeline target

Codex review narrows the first implementation candidate to server-observable lifecycle events only: `generated`, `opened`, and `revoked`. `copied`, `manually_shared`, `expired`, `send_*`, and `provider_blocked` remain design guidance for later slices unless explicitly approved.

Example V1 expanded row:

```text
● May 1, 9:14 AM   Opened by customer
                   via portal link
● Apr 28, 4:01 PM  Link generated
                   by Otto Mendez · expires May 31
```

If the token is later revoked, `Revoked` appears at the top after the revoke route writes the event and the query invalidates. If a token expires, the collapsed token row continues to carry the `Expired [date]` signal from derived token state; V1 does not render a synthetic `Expired` timeline row unless a later scheduler/sweep or materialized expiry event path is approved.

## Proposed contract sketch — not authorized to land

This section is a non-binding implementation sketch for a future schema/RLS slice. It does not approve TypeScript types, route paths, hooks, API-client functions, migrations, RLS policies, or event writes.

This slice defines the *contract* the future implementation will fulfil. It does not implement the contract.

### Type (proposed, lives in `packages/types`)

```ts
export type CustomerPortalAccessTokenEventKind =
  | "generated"
  | "copied"
  | "manually_shared"
  | "opened"
  | "revoked"
  | "expired"
  | "send_attempted"
  | "send_succeeded"
  | "send_failed"
  | "provider_blocked";

export interface CustomerPortalAccessTokenEvent {
  id: string;
  token_id: string;
  customer_id: string;
  kind: CustomerPortalAccessTokenEventKind;
  occurred_at: string; // ISO
  actor_display_name: string | null; // pre-resolved server-side; never a raw user id
  metadata: {
    channel?: "email" | "text" | "other";
    reason?:
      | "invalid_address"
      | "provider_error"
      | "rate_limited"
      | "blocked"
      | "unsubscribed"
      | "bounced"
      | "complaint";
    has_expiration?: boolean;
    expires_at?: string | null;
  };
}

export interface CustomerPortalAccessTokenEventListResponse {
  events: CustomerPortalAccessTokenEvent[];
  truncated_before: string | null;
}
```

**Critical constraint:** `actor_display_name` is computed server-side. The UI never sees `created_by` user IDs. Metadata is a strict whitelist — no token hash, no raw URL, no IP address, no user-agent, no webhook payload, no provider message id (only `provider_message_id_redacted: boolean` if needed downstream), no internal note text.

### API route (proposed)

`GET /api/portal/access-tokens/{tokenId}/events`
- Auth: admin (same boundary as `listCustomerPortalAccessTokens`).
- Response: `CustomerPortalAccessTokenEventListResponse`.
- Scoping: server-enforced — admin can only fetch events for tokens belonging to customers they have access to.

### api-client helper (proposed, lives in `packages/api-client`)

```ts
export async function listCustomerPortalAccessTokenEventsRecord(
  tokenId: string,
): Promise<CustomerPortalAccessTokenEventListResponse>;
```

Follows the existing `listCustomerPortalAccessTokenRecords` pattern (admin auth header, JSON response, no Supabase from UI).

### Domain helper (proposed, lives in `packages/domain/closeouts.ts`)

```ts
export function listCustomerPortalAccessTokenEvents(
  tokenId: string,
): Promise<CustomerPortalAccessTokenEvent[]>;
```

Pass-through to the api-client, matching the existing `listCustomerPortalAccessTokens` shape.

### Hook (proposed, lives in `apps/web/hooks/useCustomerPortalAccess.ts`)

```ts
export const customerPortalAccessTokenEventsQueryKey = (tokenId: string) =>
  ["customer-portal-access-token-events", tokenId] as const;

export function useCustomerPortalAccessTokenEvents(
  tokenId: string,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: customerPortalAccessTokenEventsQueryKey(tokenId),
    queryFn: () => listCustomerPortalAccessTokenEvents(tokenId),
    enabled: options?.enabled ?? false,
  });
}
```

`enabled: false` is the default so the query only fires when a row is expanded — keeps the audit list cheap to render when no admin is drilling in.

### Cache invalidation

- On successful `revokeCustomerPortalAccessToken`: invalidate `customerPortalAccessTokenEventsQueryKey(tokenId)` in addition to the existing token-list invalidation, so a freshly opened timeline reflects the `revoked` event.
- On future send mutations (slice 006): invalidate the same key for that token.
- Per-token isolation means revoking token A never refetches token B's events.

---

## Copy bank

**Per-row expand affordance:**
- `▾ History`
- `▴ Hide history`

**Timeline event labels (line 1, V1):**
- `Link generated`
- `Opened by customer`
- `Revoked`

**Timeline event labels (deferred-kind copy):**
- `Link copied`
- `Manually shared`
- `Expired`
- `Send attempted`
- `Send succeeded`
- `Send failed`
- `Provider blocked`

**Timeline body copy (line 2 — actor + metadata):**
- `by [Actor Name]`
- `by an admin` *(fallback when actor display name is null)*
- `via portal link` *(opened event)*
- `system` *(expired event)*
- `· expires [date]`
- `· no expiration`
- `· via email`
- `· via text`
- `· via other`
- `· invalid address`
- `· provider error`
- `· rate limited`
- `· blocked`
- `· unsubscribed`
- `· bounced`
- `· complaint`

**Timeline states:**
- `No recorded history yet.`
- `History before [date] isn't recorded.`
- `Couldn't load history.`
- `Retry`

**ARIA labels:**
- `Event history for portal link created [date]` *(timeline region)*
- `Show event history for portal link created [date]` *(expand button — sr-only supplement to the visible `▾ History`)*
- `Hide event history for portal link created [date]` *(collapse button)*

If the created date cannot be formatted, fall back to `Event history for portal link`, `Show event history for portal link`, and `Hide event history for portal link`.

## Data-loading note

The per-token query sketch is acceptable only because V1 keeps one row open at a time, bounding event fetch fanout at one active request per `CustomerPortalLinks` instance. If multi-row expansion or aggregate comparison is approved later, switch to a customer-scoped event query or token-list enrichment after checking payload size.

## Open implementation decisions

- `opened` can render either from a synthetic event derived from `last_used_at` or from a discrete event row per access. The schema/RLS slice must choose before implementation.
- `expired` is absent from the V1 timeline and remains derived collapsed-row state unless an approved scheduler/sweep or materialized event path exists.
- Retention policy must be chosen before `truncated_before` has concrete behavior.

---

## Layout notes (Next / Tailwind, existing patterns)

- **Expand button:** `min-h-9 px-1 text-xs font-semibold text-primary hover:underline` — matches the existing `Generate new` text link style.
- **Row line 2 with expand:** existing `flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between`. Right-side group becomes `<div className="flex shrink-0 gap-1">` containing `▾ History` and (if active) `Revoke`.
- **Timeline container:** `mt-2 rounded-md border border-gray-200 bg-white px-3 py-2`.
- **Timeline list:** `<ol className="flex flex-col">` with no list markers (`list-none` implied).
- **Timeline item:** `<li className="flex gap-3 py-1">`.
- **Event dot:** `mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full` + per-kind colour class.
- **Timestamp:** `text-xs font-semibold text-gray-500`.
- **Event label:** `text-xs font-semibold text-neutralDark ml-2`.
- **Event body:** `text-xs text-gray-500 mt-0.5`.
- **Partial-history footer:** `mt-2 text-xs italic text-gray-400`.
- **Empty state:** `text-xs text-gray-500 italic`.
- **Error state:** `text-xs font-semibold text-red-700` + sibling `Retry` button `text-xs font-semibold text-primary hover:underline`.
- **Skeleton items (loading):** three `flex gap-3 py-1` rows; each contains `mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-200` for the dot and stacked `h-3 w-32 animate-pulse rounded bg-gray-100` / `h-3 w-24 mt-1 animate-pulse rounded bg-gray-100` for label and body.

---

## AGENTS conformance self-check

| Concern | Plan | Status |
|---|---|---|
| **No direct Supabase from UI** | All event reads through proposed `useCustomerPortalAccessTokenEvents` → `listCustomerPortalAccessTokenEvents` (domain) → `listCustomerPortalAccessTokenEventsRecord` (api-client) → server route. Mirrors the existing token-list architecture. | ✅ |
| **Business logic in `packages/domain`** | The proposed `listCustomerPortalAccessTokenEvents` is a thin pass-through. Any per-event derivation (e.g., grouping by day, picking a representative event) belongs in `packages/domain`, not the component. No new derivation required in this slice — UI renders the server's ordered list directly. | ✅ |
| **Shared types in `packages/types`** | `CustomerPortalAccessTokenEvent`, `CustomerPortalAccessTokenEventKind`, and `CustomerPortalAccessTokenEventListResponse` are specified to live in `packages/types/index.ts` alongside the existing token types. | ✅ |
| **No schema changes in this slice** | The schema (events table, RLS policies, retention rules) is explicitly deferred to a future approval-required implementation slice — flagged in non-goals and in the Open Questions. This slice writes no SQL, declares no migrations, and produces no event records. | ✅ |
| **No raw token, token hash, raw URL, or service-role data exposure** | Event metadata whitelist explicitly excludes `token_hash`, `portal_url`, `access_token`, IP address, user-agent, webhook payload, provider secrets, and internal notes. Actor display name is pre-resolved server-side; no raw user IDs cross the boundary. | ✅ |
| **No provider delivery in this slice** | `send_*` and `provider_blocked` event kinds are defined as future-fed; no provider call is made by any UI surface introduced here. The send/resend buttons themselves remain owned by slice 006 and remain not-rendered until provider readiness lands. | ✅ |
| **No customer contact field changes** | No new contact fields. Actor metadata is admin-only; customer-side events (`opened`) have no actor and no contact info. | ✅ |
| **No mobile offline behavior** | Audit events are an admin web surface only. The mobile app does not render the timeline. Out of scope per the brief. | ✅ |
| **No raw-token persistence on the client** | The session `latestLink` flow (slice 002) is untouched. The timeline never displays or stores raw URLs. | ✅ |
| **Customer-safe portal boundary preserved** | Event reads are admin-authenticated. Customer portal routes (`/api/portal/{customerId}/closeouts`, `/billing`) are unchanged. | ✅ |
| **Session-only feedback never crosses into persisted events** | `copyFlash`, `message`, `latestLink`, and the revoke confirmation card stay in component state and never call any event-write route. The persisted `copied` event has its own future explicit server route. | ✅ |

---

## Open questions for Codex

1. **Retention policy.** How far back should the events table preserve history per token? Forever (auditable but storage-heavy), 12 months (matches typical compliance windows), or only while the token is active + 90 days after expiration/revocation? The `truncated_before` field in the response shape supports any of these. Recommend Codex pick before schema work.

2. **Copied-event server route.** Logging a `copied` event requires a new authenticated client → server call (`POST /api/portal/access-tokens/{id}/events/copied`) immediately after `navigator.clipboard.writeText` resolves. Confirm Codex wants the client to be the source of truth here, or whether copy events should be inferred from a different signal (e.g., a Vercel edge log of the share modal opening — *not* recommended, since it conflates intent with action).

3. **Manually-shared event source.** This event has no automatic trigger. To populate it, the UI needs a separate "I shared this manually" button (e.g., a small `Mark as shared` link in the post-generation action area). Does Codex want that button in this slice, the next slice, or never? If never, the `manually_shared` kind can be dropped — but offices that share via printed forms or in-person handoffs lose that signal.

4. **`opened` derivation vs. dedicated writes.** The current schema already updates `last_used_at` on portal access. Two options for `opened` events: (a) derive a single synthetic `opened` event from `last_used_at` (loses multi-access history — admin sees "opened once" even if customer opened the portal six times); (b) write a discrete event row per access (richer history, more storage). Recommend (b) for the audit slice's stated goal of seeing handling *over time*.

5. **Expired-event trigger.** `expired` could be (a) lazy — written on first server access attempt after `expires_at`; (b) eager — written by a daily sweep job. (a) is simpler but means a token expiring during a quiet period has no `expired` event until someone tries to use it. (b) requires a scheduled job. Recommend (a) for V1; document the gap in admin-facing copy if needed.

6. **Multi-row expand.** The proposal restricts the audit list to one open row at a time. Is that the right constraint, or should admins be able to expand multiple rows for cross-token comparison? Single-row is simpler and avoids unbounded vertical growth; multi-row is more powerful for forensic investigation. Recommend starting single-row and revisiting if requested.

7. **Customer-visible audit.** Should customers see *their own* portal access history (a "last opened from this device" line on the portal itself)? Out of scope for this admin slice, but worth flagging — it touches the same event table.

8. **Search / filter inside timeline.** For tokens with many events (e.g., a long-lived no-expiration token with dozens of opens), should the timeline support filtering by kind? Out of scope for V1 — the timeline is short by construction for typical tokens — but flagged.

9. **Send-event copy when channel is unknown.** If a future `send_attempted` event lands without a `channel` value, the body should fall back to `by [Actor]` with no channel suffix. Confirm Codex wants that fallback, or whether a missing channel is a server-side bug to fail loudly on.

10. **Empty-state copy timing.** `No recorded history yet.` reads correctly for a freshly-generated token whose `generated` event hasn't been written yet (race condition between token creation and event write). Is that the expected behavior, or should the UI optimistically inject a synthetic `generated` row while waiting for the server? Recommend showing the empty state — race window is sub-second and the next refetch fills it in.

---

## Follow-up ideas (out of scope, noted per the brief)

- **Aggregate per-customer audit view.** A "Portal access history" tab on the customer detail panel that merges events across every token for the customer, sorted by `occurred_at`. Useful for "did this customer ever open *any* of the four links we sent them?" Needs the events table to exist.
- **Export to CSV / PDF.** Right-side `Export` link on each expanded timeline → downloads a customer-safe CSV of the events. Compliance-friendly. No schema work beyond the events table.
- **Filterable timeline.** Pills above the timeline: `All` / `Sends` / `Opens` / `Revokes`. Out of scope until volume justifies it.
- **Highlight unusual sequences.** If a token shows `send_failed` three times in a row, surface a row-level callout: `Repeated send failures — verify contact.` Domain-derived from the event list.
- **Webhook-driven `opened` events.** If a future portal route emits a server-side event on first render (instead of relying on the existing `last_used_at` write), per-device open counts become possible. Schema and route work — V2+.
- **Linkable event IDs.** Deep-link `?token=…&event=…` to scroll to and highlight a specific event for cross-team chat / ticket references. Cheap, but only valuable after the events surface itself is in use.
- **Per-event admin notes.** Internal `note` field that admins can attach to a specific event (e.g., "customer called us about this open"). Explicitly out of scope — the brief forbids internal notes in customer-safe surfaces. If added, must be scoped to admin-only rendering with explicit RLS.
