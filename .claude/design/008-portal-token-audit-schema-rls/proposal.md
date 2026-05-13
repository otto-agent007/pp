# Proposal: Portal Token Audit Schema/RLS V1 — Operator-Facing UI Guidance

## Goal & non-goals

- **Goal:** Specify the exact operator-facing V1 audit timeline — layout, copy, and all UI states — for the three server-observable token lifecycle events (generated, opened, revoked) so Codex can implement the schema, RLS, routes, and event writes with no copy or state-map ambiguity.
- **Non-goals:** defining the database table, RLS policies, indexes, migrations, SQL, event-write routes, or any Supabase-side implementation; persisting copy/manual-share, provider send/resend, or expired events; adding customer-visible audit history; adding retention controls, exports, or aggregate views; changing token authorization, hashing, expiration, or revoke behaviour; implementing the `send`/`resend` provider buttons from slice 006.

---

## Approach

`CustomerPortalLinks` (`apps/web/app/customers/customer-portal-links.tsx`) already exposes a dense token audit list with collapsed rows. Slice 007 specified the expand affordance and full event taxonomy. This slice narrows that guidance to the V1 subset — three event kinds only — and resolves every operator-facing ambiguity Codex needs before implementation:

1. **What an admin sees in the collapsed row** vs inside the expanded history drawer, at V1 scope.
2. **How to represent one-opened vs many-opened events** without exposing schema decisions.
3. **Copy and states for tokens that predate audit tracking** ("pre-audit tokens").
4. **How the drawer handles every failure mode** — unavailable route, 403, partial data, empty history.
5. **Derived expired state** in the collapsed row when no `expired` event exists.
6. **Which slice 007 copy is still deferred** and must not appear in V1 output.

No new pages, no new routes in this slice. All data access must flow through `packages/api-client` → authenticated server route, mirroring the existing `listCustomerPortalAccessTokenRecords` pattern. All event summary derivation belongs in `packages/domain`, not in `CustomerPortalLinks` directly.

---

## Information hierarchy — `CustomerPortalLinks`

### Collapsed row (default — current behaviour preserved)

```
┌────────────────────────────────────────────────────────────────┐
│  TOKEN AUDIT LIST                                              │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ ●  Active                          Created Apr 28        │  │
│  │    Expires May 31 · Opened May 1     ▾ History  [Revoke] │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │ ○  Expired                         Created Apr 10        │  │
│  │    Expired Apr 25 · Never opened     ▾ History           │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │ ○  Revoked                         Created Apr 2         │  │
│  │    Revoked · Opened Apr 4            ▾ History           │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

**What the collapsed row conveys** (from existing `CustomerPortalAccessTokenSummary` fields — no new route):
- State dot + label: derived by `getCustomerPortalAccessTokenState()` in `packages/domain/closeouts.ts` (line 388).
- Created date: `token.created_at`.
- Expiry/expired fact: `tokenExpiryText(token)` helper in `customer-portal-links.tsx` (line 73) — `Expires [date]`, `Expired [date]`, or absent for no-expiry active tokens.
- Opened fact: `formatOpened(token.last_used_at)` helper (line 28) — `Opened [date]` or `Never opened`.
- Revoked fact: when state is `"revoked"`, line 2 reads `Revoked · Opened [date]` or `Revoked · Never opened`.

**The collapsed row does not change in V1.** All four fields already exist on `CustomerPortalAccessTokenSummary`; no audit events are required to render the collapsed row. The expand affordance (`▾ History`) is new.

### Expanded drawer (V1 — generated, opened, revoked only)

```
┌────────────────────────────────────────────────────────────────┐
│ ●  Active                            Created Apr 28            │
│    Expires May 31 · Opened May 1       ▴ Hide history [Revoke] │
│    ┌──────────────────────────────────────────────────────┐    │
│    │ ● May 1, 9:14 AM   Opened by customer                │    │
│    │                    via portal link                   │    │
│    │ ● Apr 28, 4:01 PM  Link generated                    │    │
│    │                    by Otto Mendez · expires May 31   │    │
│    └──────────────────────────────────────────────────────┘    │
│                                                                │
│ ●  Active                            Created Apr 28            │
│    Expires May 31 · Opened May 3       ▴ Hide history [Revoke] │
│    ┌──────────────────────────────────────────────────────┐    │
│    │ ● May 3, 11:02 AM  Opened by customer                │    │
│    │                    via portal link                   │    │
│    │ ● May 1, 9:14 AM   Opened by customer                │    │
│    │                    via portal link                   │    │
│    │ ● Apr 28, 4:01 PM  Link generated                    │    │
│    │                    by Otto Mendez · expires May 31   │    │
│    └──────────────────────────────────────────────────────┘    │
└────────────────────────────────────────────────────────────────┘
```

The second example above illustrates a token that has been opened twice. Each opened event is a discrete row — no "first opened / last opened" language, no count. The copy is identical for every opened entry: `Opened by customer / via portal link`. Admins read the chronological sequence naturally; the UI makes no schema assumption about whether multiple opens are stored or not.

---

## Section-by-section breakdown

### Expand affordance (per-row `▾ History` toggle)

**Location:** right side of line 2, immediately left of `[Revoke]` (or alone on expired/revoked rows).

**States:**

| Toggle state | Text | Style |
|---|---|---|
| Collapsed | `▾ History` | `text-xs font-semibold text-primary hover:underline min-h-9 px-1` |
| Expanded | `▴ Hide history` | Same style, chevron rotated |

**One-row-at-a-time policy:** a `useState<string | null>(null)` holding `expandedTokenId` lives in `CustomerPortalLinks`. Opening row B collapses row A. This bounds vertical growth and keeps the audit list scannable when a customer has many tokens.

**ARIA:**
- Button: `aria-expanded={isExpanded}` + `aria-controls={timelineId}`.
- Timeline region: `id={timelineId}` + `role="region"` + `aria-label="Event history for portal link created [date]"`.
- Fallback if `created_at` cannot be formatted: `"Event history for portal link"`.
- Screen-reader supplement on the button (visually hidden): `"Show event history for portal link created [date]"` / `"Hide event history for portal link created [date]"`.

**Keyboard:** standard `<button type="button">`. Enter/Space toggle. Focus ring inherited from existing button base. Escape while focus is inside the expanded drawer collapses the row and returns focus to the toggle button (matches the existing revoke-confirm keyboard handler pattern at line 229 of `customer-portal-links.tsx`).

---

### Expanded history drawer — container

```html
<div
  role="region"
  aria-label="Event history for portal link created Apr 28"
  className="mt-2 rounded-md border border-gray-200 bg-white px-3 py-2"
>
  ...
</div>
```

- Sits inline below the existing row content, indented by the same `px-3`.
- White background distinguishes it from the token list's `bg-gray-50` surface — events are a "drill-in" surface, not another peer row.
- No nested borders, no shadows, no extra heading. Minimal weight.

---

### Expanded history drawer — V1 timeline items

**List element:** `<ol className="flex flex-col list-none">` (newest first).

**Item structure:**
```
<li className="flex gap-3 py-1">
  <span className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full [color class]" />
  <div>
    <div>
      <span className="text-xs font-semibold text-gray-500">[timestamp]</span>
      <span className="text-xs font-semibold text-neutralDark ml-2">[label]</span>
    </div>
    <p className="mt-0.5 text-xs text-gray-500">[body]</p>
  </div>
</li>
```

**V1 event kinds, labels, body copy, and dot colour:**

| Kind | Label (line 1) | Body copy (line 2) | Dot colour |
|---|---|---|---|
| `generated` | `Link generated` | `by [actor] · expires [date]`; or `by [actor] · no expiration` if `expires_at` is null | `bg-emerald-600` |
| `opened` | `Opened by customer` | `via portal link` | `bg-emerald-600` |
| `revoked` | `Revoked` | `by [actor]` | `bg-red-500` |

**Actor display rule:** the future events API pre-resolves actor names server-side and returns `actor_display_name: string | null`. The component never receives raw user IDs. If `actor_display_name` is null, render `by an admin`.

**Timestamp format:** `Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" })` — e.g. `May 1, 9:14 AM`. Consistent with existing `formatDate` usage in `customer-portal-links.tsx`.

**Sort order:** newest first, by `occurred_at` descending. The API returns events pre-sorted; the component renders in response order.

---

### Handling one-opened vs many-opened events

The schema choice — whether to write one `opened` event per portal access or derive a single event from `last_used_at` — is Codex's decision and must not surface as visible UI difference. The component renders exactly the events the API returns, treating each `opened` event identically:

- One `opened` event in the response → one `Opened by customer / via portal link` row.
- Three `opened` events → three identical rows, ordered newest-first by `occurred_at`.

No count label (e.g. "Opened 3 times"), no "first opened" / "last opened" wording, no grouping. The chronological sequence is self-evident. If Codex later decides to cap or paginate high-open-count tokens, a `truncated_before` signal (described below) handles that without changing event row copy.

---

### Expired state — collapsed row only, no drawer event

In V1, there is no `expired` audit event. A token's expired state is derived from `token.expires_at` and the current time by `getCustomerPortalAccessTokenState()` in `packages/domain/closeouts.ts` (line 388). This derivation already drives the collapsed row's `Expired [date]` label via `tokenExpiryText()`.

**Inside the expanded drawer:** do not render a synthetic `Expired` timeline item. The V1 drawer ends at the most recent V1 event (e.g. `Link generated` or `Opened by customer`). The collapsed row above already tells the admin the token is expired; repeating it inside the drawer as a pseudo-event would imply a server write exists when none does.

**If Codex later approves a scheduler/sweep job that materialises an `expired` event,** that event will arrive via the same API response and will render as a discrete row with the then-approved copy. No UI change is needed; the component renders what the server returns.

---

## State map — expanded history drawer

| State | Condition | Treatment |
|---|---|---|
| **Collapsed (default)** | `expandedTokenId !== token.id` | `▾ History` button visible. No timeline rendered, no query fired. |
| **Loading (initial expand)** | `isLoading === true` | Three skeleton items: each a `flex gap-3 py-1` row with `mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-200` dot and stacked `h-3 w-32 animate-pulse rounded bg-gray-100` / `h-3 w-24 mt-1 animate-pulse rounded bg-gray-100` placeholders. |
| **Stale-while-revalidating** | `isFetching && !isLoading` | Existing events remain visible. No skeleton flash. No extra UI. |
| **Loaded — events present** | Success, `events.length > 0` | Newest-first list per spec above. |
| **Loaded — empty (no events)** | Success, `events.length === 0` | `<p className="text-xs italic text-gray-500">No history recorded for this link.</p>` |
| **Loaded — pre-audit token** | Success, `events.length === 0`, `truncated_before` non-null | `<p className="text-xs italic text-gray-500">No history recorded for this link.</p>` + partial-history footer (see below). Visually identical to empty state; the footer distinguishes the cause. |
| **Partial history** | `truncated_before` is a non-null ISO date string | Events render normally. Footer below the last item: `<p className="mt-2 text-xs italic text-gray-400">History before [formatted date] isn't recorded.</p>` |
| **Error — generic (5xx / network)** | `isError === true` | `<p className="text-xs font-semibold text-red-700">Couldn't load history.</p>` + inline `[Retry]` button: `text-xs font-semibold text-primary hover:underline`. On retry, refetch; return to loading state. |
| **Error — route unavailable (503 / 404)** | Server returns non-OK with no retry signal | Same error treatment as generic error. Do not distinguish 503 from other failures in admin-facing copy — the fix is always Codex-side. |
| **Error — forbidden (403)** | Server returns 403 | `<p className="text-xs font-semibold text-red-700">History isn't available for this link.</p>` No retry button (retrying a 403 will not help without a permission change). |
| **Partial / redacted response** | Server returns `events` but some items have `actor_display_name: null` | Render normally; null actor renders as `by an admin`. No warning shown for individual null actors — this is expected for system events or privacy-redacted writes. |
| **Token revoked while drawer open** | `useRevokeCustomerPortalAccessToken` succeeds | React Query invalidation on `customerPortalAccessTokenEventsQueryKey(tokenId)` causes the drawer to refetch. The new `revoked` event appears at the top on next render. No manual reload needed. |
| **Token list loading (parent)** | `tokensQuery.isLoading === true` | Existing 2 skeleton rows (unchanged from slice 002). `▾ History` button is not rendered for skeleton rows. |

### `truncated_before` signal

The future events endpoint includes `truncated_before: string | null` in its response. When non-null, this ISO date is formatted as `MMM D, YYYY` for the partial-history footer. This preserves admin trust — "older events exist but aren't in the retention window" vs silent omission.

**Pre-audit token detection:** if a token was created before audit event tracking existed, the server may return `events: []` with `truncated_before` set to the audit system's go-live date (or the token's `created_at`, whichever is later). The footer handles this: `"History before [date] isn't recorded."` This is accurate — history before that date genuinely wasn't recorded — and avoids the false implication that "no events" means the token was never used.

---

## Row-collapsed vs expanded — information boundary summary

| Fact | Source | Collapsed row | Expanded drawer |
|---|---|---|---|
| Token state (Active / Expired / Revoked) | `CustomerPortalAccessTokenSummary.status` + `expires_at` | ✅ State dot + label | — (not repeated) |
| Created date | `CustomerPortalAccessTokenSummary.created_at` | ✅ `Created [date]` | ✅ `Link generated` event row (includes actor + expiry) |
| Expires / expired date | `CustomerPortalAccessTokenSummary.expires_at` | ✅ `Expires [date]` / `Expired [date]` | — (not a V1 event row) |
| Last opened | `CustomerPortalAccessTokenSummary.last_used_at` | ✅ `Opened [date]` / `Never opened` | ✅ Each `opened` event row (one or many) |
| Revoke date | `CustomerPortalAccessTokenSummary.updated_at` (when status = revoked) | — (not shown in current collapsed row) | ✅ `Revoked` event row (includes actor) |
| Actor who generated | Not in `CustomerPortalAccessTokenSummary` | — (not shown) | ✅ `Link generated` event body |
| Actor who revoked | Not in `CustomerPortalAccessTokenSummary` | — (not shown) | ✅ `Revoked` event body |

The collapsed row continues to answer "what is the current state of this token?" The expanded drawer answers "who did what, and when?" The two surfaces complement each other without duplication.

---

## Copy bank

**Expand affordance:**
- `▾ History`
- `▴ Hide history`
- `Show event history for portal link created [date]` *(sr-only supplement)*
- `Hide event history for portal link created [date]` *(sr-only supplement)*
- `Event history for portal link created [date]` *(region aria-label)*
- Fallbacks (no date): `Show event history for portal link` / `Hide event history for portal link` / `Event history for portal link`

**V1 event labels (line 1):**
- `Link generated`
- `Opened by customer`
- `Revoked`

**V1 event body copy (line 2):**
- `by [Actor Name]` *(generated, revoked with named actor)*
- `by an admin` *(generated or revoked, actor_display_name null)*
- `· expires [date]` *(generated, expires_at non-null)*
- `· no expiration` *(generated, expires_at null)*
- `via portal link` *(opened)*

**Drawer state copy:**
- `No history recorded for this link.` *(empty — no events, no truncation; or empty with pre-audit truncation)*
- `History before [date] isn't recorded.` *(partial-history / pre-audit footer)*
- `Couldn't load history.` *(generic fetch error)*
- `History isn't available for this link.` *(403 forbidden — no retry)*
- `Retry` *(retry link, generic error only)*

**Deferred copy — must NOT appear in V1 output:**
- `Link copied` *(copied event, deferred)*
- `Manually shared` *(manually_shared event, deferred)*
- `Expired` *(expired event, deferred pending scheduler/sweep approval)*
- `Send attempted` / `Send succeeded` / `Send failed` / `Provider blocked` *(send/resend events, deferred pending provider boundary)*
- `· via email` / `· via text` / `· via other` *(channel metadata, deferred with send events)*
- `· invalid address` / `· provider error` / `· rate limited` / `· unsubscribed` / `· bounced` / `· complaint` *(delivery reason copy, deferred)*
- `Mark as shared` *(manually_shared trigger UI, deferred)*

---

## Layout notes

All classes reference existing patterns already present in `customer-portal-links.tsx` or `packages/ui-tokens`.

- **Expand button:** `min-h-9 px-1 text-xs font-semibold text-primary hover:underline` — matches the existing `Generate new` text-link style.
- **Right-side row group (line 2):** `<div className="flex shrink-0 items-center gap-1">` containing `▾ History` button and (if active) `[Revoke]` button. No change to `[Revoke]` positioning — history toggle is prepended.
- **Timeline container:** `mt-2 rounded-md border border-gray-200 bg-white px-3 py-2`
- **Timeline list:** `<ol className="flex flex-col list-none">` — no list markers.
- **Timeline item:** `<li className="flex gap-3 py-1">`
- **Event dot:** `mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full` + colour class (`bg-emerald-600`, `bg-red-500`).
- **Timestamp (line 1 left):** `text-xs font-semibold text-gray-500`
- **Event label (line 1 right of timestamp):** `text-xs font-semibold text-neutralDark ml-2`
- **Event body (line 2):** `text-xs text-gray-500 mt-0.5`
- **Partial-history footer:** `mt-2 text-xs italic text-gray-400`
- **Empty / pre-audit state:** `text-xs italic text-gray-500`
- **Error label:** `text-xs font-semibold text-red-700`
- **Retry link:** `ml-1 text-xs font-semibold text-primary hover:underline`
- **Skeleton dot:** `mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-200`
- **Skeleton label placeholder:** `h-3 w-32 animate-pulse rounded bg-gray-100`
- **Skeleton body placeholder:** `mt-1 h-3 w-24 animate-pulse rounded bg-gray-100`

---

## Proposed hook / api-client sketch — not authorised to land

This section is non-binding design input so Codex has a consistent interface target. It does not authorise TypeScript types, route paths, event writes, RLS policies, migrations, or production mutations.

### Types (proposed, `packages/types/index.ts`)

```ts
export type CustomerPortalAccessTokenEventKind =
  | "generated"
  | "opened"
  | "revoked";
  // future: "copied" | "manually_shared" | "expired" | "send_attempted"
  //         | "send_succeeded" | "send_failed" | "provider_blocked"

export interface CustomerPortalAccessTokenEvent {
  id: string;
  token_id: string;
  customer_id: string;
  kind: CustomerPortalAccessTokenEventKind;
  occurred_at: string; // ISO
  actor_display_name: string | null; // pre-resolved server-side; never a raw user id
  metadata: {
    // generated only:
    has_expiration?: boolean;
    expires_at?: string | null;
    // future kinds add fields here, strictly whitelisted
  };
}

export interface CustomerPortalAccessTokenEventListResponse {
  events: CustomerPortalAccessTokenEvent[];
  truncated_before: string | null;
}
```

`actor_display_name` is computed server-side. `CustomerPortalAccessTokenSummary` already omits `created_by`; the events response must follow the same discipline — no raw user IDs, no `token_hash`, no `access_token`, no IP, no user-agent, no webhook payload, no provider data, no internal notes.

### api-client function (proposed, `packages/api-client/portal.ts`)

```ts
export async function listCustomerPortalAccessTokenEventsRecord(
  tokenId: string,
): Promise<CustomerPortalAccessTokenEventListResponse> {
  const adminAccessToken = await getAccessToken();
  const headers: Record<string, string> = {};
  if (adminAccessToken) {
    headers.Authorization = `Bearer ${adminAccessToken}`;
  }
  const response = await fetch(
    `/api/portal/access-tokens/${encodeURIComponent(tokenId)}/events`,
    { headers },
  );
  if (response.status === 403) {
    throw new ForbiddenError("Portal token events are not accessible");
  }
  if (!response.ok) {
    throw new Error("Unable to load portal access token events");
  }
  return (await response.json()) as CustomerPortalAccessTokenEventListResponse;
}
```

Matches the `revokeCustomerPortalAccessTokenRecord` pattern at line 117 of `packages/api-client/portal.ts`.

### Domain function (proposed, `packages/domain/closeouts.ts`)

```ts
export async function listCustomerPortalAccessTokenEvents(
  tokenId: string,
): Promise<CustomerPortalAccessTokenEventListResponse> {
  return listCustomerPortalAccessTokenEventsRecord(tokenId);
}
```

Thin pass-through, consistent with `listCustomerPortalAccessTokens` at line 504 of `packages/domain/closeouts.ts`.

### Hook (proposed, `apps/web/hooks/useCustomerPortalAccess.ts`)

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

`enabled: false` default — query only fires on row expand. Keeps the token list cheap to render when no row is open.

### Cache invalidation additions

In `useRevokeCustomerPortalAccessToken` (currently at line 115 of `useCustomerPortalAccess.ts`), add to `onSettled`:

```ts
void queryClient.invalidateQueries({
  queryKey: customerPortalAccessTokenEventsQueryKey(id),
});
```

This ensures an open history drawer reflects the `revoked` event immediately after the revoke mutation settles. Token A's events are never invalidated by a revoke of token B — per-token key isolation is preserved.

In `useCreateCustomerPortalAccessToken`, no event invalidation is needed — newly generated tokens start with an empty event history and the query fires `enabled: false` until an admin expands the row.

---

## AGENTS conformance self-check

| Concern | This proposal's position | Status |
|---|---|---|
| **No direct Supabase from UI** | All event reads flow through the proposed `useCustomerPortalAccessTokenEvents` hook → `listCustomerPortalAccessTokenEvents` (domain) → `listCustomerPortalAccessTokenEventsRecord` (api-client) → server route. Mirrors `listCustomerPortalAccessTokens` at line 504 of `packages/domain/closeouts.ts`. | ✅ |
| **No schema design** | This proposal specifies no database table, column types, indexes, triggers, RLS policy text, or migrations. All are deferred to Codex. | ✅ |
| **No event writes** | No route for writing `generated`, `opened`, or `revoked` events is specified. Those writes belong server-side (Codex), triggered by existing or new server-side lifecycle points. | ✅ |
| **Business logic in `packages/domain`** | `listCustomerPortalAccessTokenEvents` (thin pass-through) lives in `packages/domain/closeouts.ts`. Any future derivation (day grouping, kind filtering, count summaries) must also live there, not in `CustomerPortalLinks`. | ✅ |
| **Shared types in `packages/types`** | `CustomerPortalAccessTokenEvent`, `CustomerPortalAccessTokenEventKind`, and `CustomerPortalAccessTokenEventListResponse` are specified to live in `packages/types/index.ts`, alongside the existing `CustomerPortalAccessTokenSummary` and `CustomerPortalAccessTokenListResponse`. | ✅ |
| **No raw portal URL, access token, token hash, or service-role data in UI** | `actor_display_name` pre-resolved server-side. Metadata whitelist explicitly excludes `token_hash`, `access_token`, `portal_url`, `created_by` (raw ID), IP, user-agent, webhook payload, provider message ID, provider secrets, and internal notes. | ✅ |
| **No provider delivery** | `send_attempted`, `send_succeeded`, `send_failed`, `provider_blocked` are named deferred kinds. No provider call, no send button, no delivery status appears in this proposal. | ✅ |
| **No migration / RLS / production mutation** | The proposal sketch is explicitly marked non-binding and non-authorised. No migration is approved by this document. | ✅ |
| **No customer-unsafe metadata** | `opened` events carry no actor, no IP, no user-agent. `generated` and `revoked` carry display-name-resolved actor and whitelisted metadata only. | ✅ |
| **Session-only feedback never crosses into events** | `copyFlash`, `message`, `latestLink`, and revoke confirmation card state (all in `customer-portal-links.tsx`) are unaffected. None of them interact with the events query. | ✅ |

---

## Open questions for Codex

1. **`opened` storage model.** Does the schema write a discrete event row per portal access (N rows), or derive a single synthetic `opened` event from the existing `last_used_at` column? Either choice renders correctly in this UI — the component renders whatever the API returns. However, option (a) loses multi-access history; option (b) requires no new access-route writes. Codex should document the choice before schema work begins so the `truncated_before` signal can be set correctly when only `last_used_at`-derived events exist.

2. **`generated` event write point.** The cleanest server-side trigger is the success path of `POST /api/portal/access-tokens` (which already creates the token). Confirm Codex can write the event in the same transaction or immediately after, with no gap where the token exists but no `generated` event does.

3. **`revoked` event write point.** Same question for `POST /api/portal/access-tokens/{id}/revoke`. Confirm the event write is atomic with or immediately after the status change.

4. **Pre-audit token handling.** For tokens created before the audit table exists, the events endpoint will return `events: []`. Codex must decide whether to set `truncated_before` to the token's `created_at` (most accurate: "there might have been opens before this date") or to the audit system's go-live date (simpler). The footer copy `"History before [date] isn't recorded."` is accurate for either choice; Codex picks the date.

5. **403 source.** When should the events endpoint return 403 vs an empty list? If a token belongs to a customer the requesting admin cannot access, 403 is the right choice. If the token exists and the admin has access but no events have been written yet, return `events: []` with `truncated_before: null`. Confirm the RLS/route-auth design aligns with this expectation so the UI can distinguish "no history" from "not permitted."

6. **Performance at list scale.** The one-row-at-a-time policy bounds event fetches at one in-flight request per `CustomerPortalLinks` instance. If future requirements allow multi-row expansion or if customer token counts grow large (>20 active tokens), a customer-scoped events endpoint may be preferable to per-token requests. Flag for re-evaluation at that scale rather than pre-optimising now.

7. **Revoke event timing in the expanded drawer.** After `useRevokeCustomerPortalAccessToken` succeeds, the drawer invalidates `customerPortalAccessTokenEventsQueryKey(tokenId)` and refetches. The optimistic update on the token list (line 51 of `useCustomerPortalAccess.ts`) runs first; the events refetch is an independent query cycle. Confirm this ordering is acceptable, or whether the `revoked` event should be appended optimistically to the events cache as well.

8. **Retention window.** Before `truncated_before` has concrete behaviour, Codex must decide the retention period. Options: indefinite (full audit trail, storage grows with opens), 12 months (common compliance window), token lifetime + 90 days after expiry/revoke. The `truncated_before` field in the response shape supports any of these without UI changes.

---

## Follow-up ideas (out of scope)

- **`copied` event:** deferred until an admin-authenticated event-write route is explicitly approved (slice 007 open question 2). The clipboard-success path in `customer-portal-links.tsx` (the `copyFlash` state, line 130) does not persist anything to the server today, and the session copy feedback must remain independent of any persisted event.
- **`manually_shared` event and trigger UI:** deferred until a separate "Mark as shared" affordance is approved. No trigger button in this slice.
- **`expired` event:** deferred until a scheduler/sweep job or materialized expiry path is approved. The collapsed row's derived `Expired [date]` label handles operator awareness without a persisted event.
- **Send/resend events (`send_attempted`, `send_succeeded`, `send_failed`, `provider_blocked`):** deferred until the provider delivery boundary (slice 006) is implemented and approved.
- **Timeline filtering or search:** deferred beyond V1. The one-row-at-a-time policy and short V1 event list make this unnecessary for initial release.
- **CSV/PDF export of token audit events:** deferred. Out of scope per brief.
- **Aggregate customer audit view:** deferred. Out of scope per brief.
- **Customer-visible portal access history:** a separate product decision; touches the same event table but requires a distinct RLS policy permitting customer-scoped reads.
- **`send_failed` / `provider_blocked` callout in collapsed row:** slice 006 specified a line-3 failure callout on the collapsed token row for high-signal delivery failures. That callout maps to a future `send_failed` event. Deferred with provider events.
