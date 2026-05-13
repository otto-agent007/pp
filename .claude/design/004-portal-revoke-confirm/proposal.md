# Proposal: Portal Revoke Confirmation V1

## Goal & non-goals

- **Goal:** Insert a lightweight inline confirmation step between the "Revoke" trigger and the actual revoke mutation inside `CustomerPortalLinks`, so office users cannot accidentally revoke a portal link during a share/resend workflow.
- **Non-goals:** modal or popover UI; automatic resend/send behavior; token schema changes; RLS or migration changes; customer-facing portal redesign; replacing the existing generate/copy workflow; adding audit event persistence; bulk revoke.

---

## Approach

Extend the existing `CustomerPortalLinks` component (`apps/web/app/customers/customer-portal-links.tsx`) with one new piece of local state — `confirmingId: string | null` — that marks which token row is in "confirmation mode." Clicking **Revoke** sets `confirmingId` to that token's id rather than calling the mutation directly. The row expands inline to show the confirmation prompt, token context, **Cancel**, and **Confirm revoke**. Clicking **Confirm revoke** calls the existing `revokeToken.mutate` exactly as before and clears `confirmingId`. Pressing **Cancel** or clicking **Revoke** on any other row also clears `confirmingId` first.

No new hooks, no new domain helpers, no new API routes, no schema changes. The generate/copy area (`latestLink`, `createToken`) is entirely unaffected by the new state — the two interaction flows are orthogonal.

---

## Information hierarchy — `CustomerPortalLinks` (updated token row)

```
TOKEN AUDIT LIST — row in default state
┌──────────────────────────────────────────────────────────┐
│ ●  Active — no expiration           Created Apr 28       │
│    No expiration · Never opened               [Revoke]   │
└──────────────────────────────────────────────────────────┘

TOKEN AUDIT LIST — row in confirmation-open state
┌──────────────────────────────────────────────────────────┐
│ ●  Active — no expiration           Created Apr 28       │
│    No expiration · Never opened                          │
│  ┌─ confirmation zone ──────────────────────────────┐   │
│  │ Revoke this link?                                 │   │
│  │ This link is active with no expiration and has   │   │
│  │ never been opened.                               │   │
│  │                         [Cancel]  [Confirm revoke]│  │
│  └──────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘

TOKEN AUDIT LIST — row in revoke-pending state (after Confirm revoke)
┌──────────────────────────────────────────────────────────┐
│ ●  Active — no expiration           Created Apr 28       │
│    No expiration · Never opened           [Revoking…]    │
└──────────────────────────────────────────────────────────┘
```

The rest of the component (readiness card, generate+share area) is identical to the 002-portal-share-resend implementation.

---

## Section-by-section breakdown

### Token row — default state (no confirmation open)

No visible change from the 002 implementation except the "Revoke" button now sets `confirmingId` rather than directly calling `revokeToken.mutate`.

**Button copy:** `Revoke`
**onClick:** `setConfirmingId(token.id)` — no mutation fires.
**Disabled condition:** `isRevoking` (the actual in-flight revoke, unchanged).

Tailwind (keep existing): `min-h-9 rounded-md border border-red-200 px-3 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60`

---

### Token row — confirmation-open state (`confirmingId === token.id`)

The row gains a full-width confirmation zone below the expiry/opened line. The zone is visually separated with a top border and amber background to signal "action required."

**Confirmation zone structure:**
```tsx
<div role="group" aria-label={`Confirm revoke for ${tokenRowLabel(token)}`}>
  <p>{/* heading */}</p>
  <p>{confirmPromptBody(token)}</p>
  <div>
    <button ref={cancelRef}>Cancel</button>
    <button>Confirm revoke</button>
  </div>
</div>
```

**State interactions:**

| Event | Result |
|---|---|
| User clicks **Cancel** | `setConfirmingId(null)` — row returns to default |
| User presses **Escape** | `setConfirmingId(null)` — handled via `onKeyDown` on the zone |
| User clicks **Confirm revoke** | `setConfirmingId(null)`, then `setRevokingId(token.id)`, then `revokeToken.mutate(token.id, …)` |
| User clicks **Revoke** on a different row | `setConfirmingId(otherToken.id)` — previous confirmation silently closed (only one open at a time) |
| Another row's revoke is in-flight | Other row shows `Revoking…`; this row's confirmation zone is still fully interactive |

**Confirmation prompt copy** (derived from token state at render time):

| Token state | `confirmPromptBody` output |
|---|---|
| Active, no expiration, never opened | *"This link is active with no expiration and has never been opened."* |
| Active, no expiration, opened | *"This link is active with no expiration — the customer has opened it."* |
| Active, expires later, never opened | *"This link is active and expires [date]. It has never been opened."* |
| Active, expires later, opened | *"This link is active and expires [date]. The customer last opened it [date]."* |

**Confirmation zone Tailwind:**
```
mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2
```
Prompt heading: `text-xs font-semibold text-neutralDark`
Prompt body: `mt-0.5 text-xs text-gray-600`
Button row: `mt-2 flex justify-end gap-2`

**Cancel button:** `min-h-8 rounded-md border border-gray-300 px-3 text-xs font-semibold text-neutralDark hover:bg-gray-50`
**Confirm revoke button:** `min-h-8 rounded-md bg-red-700 px-3 text-xs font-semibold text-white hover:bg-red-800`

---

### Token row — revoke-pending state (`revokingId === token.id`)

Identical to the existing implementation: the Revoke button slot shows `[Revoking…]` (disabled). The optimistic update in `useRevokeCustomerPortalAccessToken.onMutate` fires immediately, so the row transitions to revoked state from the cache before the mutation settles. `confirmingId` is cleared before `revokeToken.mutate` is called, so the confirmation zone is never visible during the pending phase.

---

### Revoke error state

Unchanged from 002: the `revokeToken.error` block renders `"Couldn't revoke link. Try again."` below the full token list. The row reverts to active via the existing `onError` rollback in `useRevokeCustomerPortalAccessToken`. The Revoke button re-appears in the row (confirmation cleared), ready for another attempt.

---

### Generate/copy area while confirmation is open

**No change.** `confirmingId` state is entirely scoped to the token row render. The `latestLink`, `copyUnavailable`, `copyFlash`, `message`, and `createToken` state/mutation are orthogonal. The office user can still click **Copy again** or **Generate new** while a revoke confirmation is open — there is no lock or blur.

---

## State map

| State | Where | Treatment |
|---|---|---|
| **Default row — active, no confirmation** | Token row | `[Revoke]` button present; onClick sets `confirmingId`. |
| **Confirmation open** | Token row (expanded) | Amber zone below expiry line; **Cancel** (auto-focused) + **Confirm revoke**; one zone at a time. |
| **Confirmation open — Escape pressed** | Token row | Zone collapses; focus returns to the triggering **Revoke** button. |
| **Confirmation open — Revoke clicked on different row** | All rows | Previous zone closes; new row expands. |
| **Revoke pending** | Token row button | `Revoking…` (disabled); optimistic revoked state fires; confirmation zone not shown. |
| **Revoke success** | Token row | Optimistic update confirmed by cache invalidation; row becomes revoked state (dim dot, no Revoke button). |
| **Revoke error** | Below token list | `"Couldn't revoke link. Try again."` (red text). Optimistic rollback restores active state. Row's Revoke button re-appears; `confirmingId` is null. |
| **Active, never opened** | Row + confirmation zone | Confirmation prompt: *"has never been opened."* |
| **Active, opened** | Row + confirmation zone | Confirmation prompt includes last-opened date. |
| **Active, no expiration** | Row + confirmation zone | `"Active — no expiration"` label; prompt calls out no expiration explicitly. |
| **Active, expires later** | Row + confirmation zone | Prompt includes `"expires [date]"`. |
| **Expired link** | Row | Dim dot; Revoke button absent; no confirmation zone possible. |
| **Revoked link** | Row | Dim dot; Revoke button absent; no confirmation zone possible. |
| **Multiple active links** | All rows | Each has its own Revoke → confirmation flow; only one `confirmingId` active at a time. |
| **Latest generated link in session** | Action area | Fully accessible; unaffected by `confirmingId`. |
| **Clipboard unavailable** | Action area | Unaffected by `confirmingId`. |
| **Loading (token list)** | Audit list | Skeleton rows; no confirmation zones possible. |
| **Error (token list fetch)** | Readiness card | Inline error with Retry; no rows rendered; no confirmation zones possible. |

---

## Copy bank

**Revoke trigger (default):** `Revoke`
**Revoke trigger aria-label:** `Revoke portal link created [formatDate(token.created_at)]`

**Confirmation zone:**
- Heading: `Revoke this link?`
- Cancel: `Cancel`
- Cancel aria-label: `Cancel revoke`
- Confirm: `Confirm revoke`
- Confirmation zone aria-label: `Confirm revoke for [tokenRowLabel(token)]`

**Confirmation body copy (by state):**
- `"This link is active with no expiration and has never been opened."`
- `"This link is active with no expiration — the customer has opened it."`
- `"This link is active and expires [date]. It has never been opened."`
- `"This link is active and expires [date]. The customer last opened it [date]."`

**Pending state (in Revoke button slot, unchanged):** `Revoking…`

**Error (below list, unchanged):** `Couldn't revoke link. Try again.`

---

## Layout notes

**New state alongside existing state in `CustomerPortalLinks`:**
```ts
const [confirmingId, setConfirmingId] = useState<string | null>(null);
```
Placed alongside the existing `revokingId` declaration (line ~109 in the current file).

**Focus management refs:**
```ts
const cancelRef = useRef<HTMLButtonElement | null>(null);
const revokeButtonRef = useRef<HTMLButtonElement | null>(null);
```
`cancelRef` is attached to the Cancel button inside the confirmation zone. A `useEffect` watching `confirmingId` calls `cancelRef.current?.focus()` immediately after the zone renders (safe-first: Cancel is the focused default). `revokeButtonRef` is attached to the triggering Revoke button (the one in the currently-non-confirming row); on Escape, `revokeButtonRef.current?.focus()` is called before `setConfirmingId(null)`. Since only one confirmation is open at a time, a single ref each is sufficient.

**`confirmPromptBody` — module-level pure helper, co-located in `customer-portal-links.tsx`:**
```ts
function confirmPromptBody(token: CustomerPortalAccessTokenSummary): string {
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
```
`formatDate` is already defined in the same file (line ~17). No new imports required.

**Token row render logic (updated, pseudocode):**
```tsx
const isActive = state === "active";
const isConfirming = confirmingId === token.id;
const isRevoking = revokingId === token.id || (revokeToken.isPending && revokingId === null);

{/* Revoke button — only when active and not in-flight */}
{isActive && !isRevoking && (
  <button
    aria-label={`Revoke portal link created ${formatDate(token.created_at)}`}
    className="min-h-9 rounded-md border border-red-200 px-3 text-xs font-semibold text-red-700 hover:bg-red-50"
    onClick={() => setConfirmingId(token.id)}
    ref={!isConfirming ? revokeButtonRef : undefined}
    type="button"
  >
    Revoke
  </button>
)}
{isActive && isRevoking && (
  <button className="... disabled:opacity-60" disabled type="button">
    Revoking…
  </button>
)}

{/* Confirmation zone — rendered below the expiry/opened line */}
{isConfirming && (
  <div
    aria-label={`Confirm revoke for ${tokenRowLabel(token)}`}
    className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2"
    onKeyDown={(e) => {
      if (e.key === "Escape") {
        setConfirmingId(null);
        revokeButtonRef.current?.focus();
      }
    }}
    role="group"
  >
    <p className="text-xs font-semibold text-neutralDark">Revoke this link?</p>
    <p className="mt-0.5 text-xs text-gray-600">{confirmPromptBody(token)}</p>
    <div className="mt-2 flex justify-end gap-2">
      <button
        aria-label="Cancel revoke"
        className="min-h-8 rounded-md border border-gray-300 px-3 text-xs font-semibold text-neutralDark hover:bg-gray-50"
        onClick={() => setConfirmingId(null)}
        ref={cancelRef}
        type="button"
      >
        Cancel
      </button>
      <button
        className="min-h-8 rounded-md bg-red-700 px-3 text-xs font-semibold text-white hover:bg-red-800"
        onClick={() => {
          setConfirmingId(null);
          setRevokingId(token.id);
          revokeToken.mutate(token.id, {
            onSettled: () => setRevokingId(null),
          });
        }}
        type="button"
      >
        Confirm revoke
      </button>
    </div>
  </div>
)}
```

**`useEffect` for auto-focus on zone open:**
```ts
useEffect(() => {
  if (confirmingId !== null) {
    cancelRef.current?.focus();
  }
}, [confirmingId]);
```

---

## AGENTS conformance self-check

| Concern | Plan | Status |
|---|---|---|
| **No direct Supabase from UI** | Revoke path unchanged — still goes through `revokeToken.mutate` → `revokeCustomerPortalAccessToken` (domain) → API route. Confirmation is pure UI state. | ✅ |
| **Business logic in `packages/domain`** | `confirmPromptBody` is a pure presentational helper co-located in `customer-portal-links.tsx`. Token state derivation still uses `getCustomerPortalAccessTokenState` from `@pest-patrol/domain`. No changes to `packages/domain`. | ✅ |
| **No schema changes** | `confirmingId` is local React state only. No new fields on `CustomerPortalAccessTokenSummary`. | ✅ |
| **No raw token persistence** | `confirmingId` holds only a token `id` (UUID). No raw token hash, URL, or credential is involved. | ✅ |
| **No automatic sending** | Revoke confirmation is a pure UI gate. No provider calls. | ✅ |
| **No service-role, token hash, internal path exposure** | Confirmation zone displays only `status`, `expires_at`, `last_used_at`, `created_at` — same fields already visible in the row. | ✅ |
| **No migrations, RLS changes, new secrets** | Zero infra changes. | ✅ |
| **Existing generate/copy unaffected** | `confirmingId` is orthogonal to `latestLink`, `createToken`, `copyUnavailable`, `copyFlash`, `message`. | ✅ |
| **One active confirmation at a time** | Single `confirmingId: string | null` replaces previous value on each Revoke click — React guarantees only one zone renders at any time. | ✅ |
| **Optimistic revoke rollback preserved** | `useRevokeCustomerPortalAccessToken.onError` rollback is untouched. `confirmingId` is already cleared before `mutate` fires, so on rollback the row returns to default state with Revoke button visible. | ✅ |
| **Hooks / React Query unchanged** | `useCustomerPortalAccessTokens`, `useCreateCustomerPortalAccessToken`, `useRevokeCustomerPortalAccessToken` — no changes to hook signatures or query keys. | ✅ |

---

## Open questions for Codex

1. **`revokeButtonRef` approach.** A single `useRef<HTMLButtonElement | null>(null)` assigned to the currently non-confirming Revoke button works because only one confirmation is open at a time. Confirm this is acceptable over a `Map<string, RefObject>` (which adds complexity with no benefit in the single-open-at-a-time constraint).
2. **Focus-on-open timing with `useEffect`.** The `useEffect` watching `confirmingId` calls `cancelRef.current?.focus()` after the zone renders. Under `userEvent.setup()` in tests, confirm that `await user.click(revokeButton)` results in the Cancel button receiving focus reliably before the next assertion — or whether `act()` wrapping is needed.
3. **Escape propagation.** The `onKeyDown` on the zone div — should it call `e.stopPropagation()` to prevent ancestor-level Escape handlers from closing the customer detail panel or any drawer? Check whether the customer detail panel or any parent component has its own Escape listener.
4. **`confirmPromptBody` test coverage.** The four copy variants (no-expiry/never-opened, no-expiry/opened, expires/never-opened, expires/opened) should each be exercised in `customer-portal-links.test.tsx`. Confirm Codex will add these cases alongside the existing revoke test at line 200.
5. **`aria-label` on the Revoke trigger.** The proposed `"Revoke portal link created [date]"` distinguishes between multiple Revoke buttons for screen readers. Verify this doesn't conflict with any existing `aria-describedby` on the row wrapper or a future tooltip.

---

## Follow-up ideas (out of scope)

- **"Undo" toast after revoke.** A brief *"Link revoked — generate a new one to reshare"* notice with a 5 s timer after revoke settles would give office users a soft undo signal. Requires a toast primitive not yet present in the component.
- **No-expiration extra warning.** The confirmation zone for a never-opened, no-expiry link could carry an amber sub-notice: *"This link has no expiration — anyone with it can still access the portal until revoked."* Low implementation cost; deferred to keep the zone compact in V1.
- **Revoke-all.** Bulk `Revoke all active` with a single section-level confirmation zone. Out of scope until multi-link usage patterns are validated.
- **Confirmation audit log.** Persist `revoked_by` and `revoked_at` alongside the token record. Schema change required — V2+.
- **Customer list "portal ready" badge.** Small inline chip on the `/customers` list row showing `Portal: active` / `Portal: none`. Derived from the same token query; no schema change.
