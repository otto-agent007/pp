# Critique: Portal Revoke Confirmation V1 (post-implementation)

Reviewed: uncommitted working-tree changes on `codex/claude-portal-share-resend-brief` atop `6fab5ca`. Implementation lives in `apps/web/app/customers/customer-portal-links.tsx` and `apps/web/app/customers/customer-portal-links.test.tsx`.

---

## What's correct against the proposal

- **`confirmingId: string | null` state** added at line 128 alongside the existing `revokingId` — exactly as specified.
- **`revokeConfirmPrompt` helper** (lines 87–104) implements all four copy variants without error: no-expiry/never-opened, no-expiry/opened, expires/never-opened, expires/opened. The only divergence from the proposal is the function name (`revokeConfirmPrompt` vs `confirmPromptBody`) — clearer, no objection.
- **Amber confirmation zone Tailwind** matches the proposal exactly: `mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2` (line 481).
- **Heading, Cancel, Confirm revoke copy** all match the copy bank verbatim.
- **Cancel button Tailwind** (`min-h-8 rounded-md border border-gray-300 px-3 text-xs font-semibold text-neutralDark hover:bg-gray-50`, line 494) and **Confirm revoke button Tailwind** (`min-h-8 rounded-md bg-red-700 px-3 text-xs font-semibold text-white hover:bg-red-800`, line 502) both match.
- **`role="group"` + `aria-label`** on the confirmation div (lines 480–483) — correct.
- **`aria-label` on the Revoke trigger** — `Revoke portal link created ${formatDate(token.created_at)}` (line 461) — matches.
- **Escape stops propagation** (`event.stopPropagation()` at line 232) — addresses the codex-review adapt point about accidental parent keyboard handling.
- **`revokeButtonRefs` as a `Map<string, HTMLButtonElement>`** (line 120, ref callback at lines 464–469) — a sound adaptation over the proposal's single ref; handles multiple token rows correctly with proper cleanup on unmount.
- **`returnFocusTokenIdRef`** pattern (line 121) cleanly separates "which row's Revoke button to return focus to" from `confirmingId`, avoiding stale-ref problems.
- **Focus auto-moves to Cancel** when confirmation opens (lines 139–141, `cancelRevokeRef.current?.focus()`).
- **Only one confirmation open at a time** — clicking Revoke on a second row calls `setConfirmingId(token.id)` (line 463), replacing any previous value atomically.
- **Generate/copy area fully orthogonal** — `latestLink`, `copyUnavailable`, `copyFlash`, `message`, `createToken` are untouched by `confirmingId`.
- **Revoke error copy** preserved: `"Couldn't revoke link. Try again."` (line 519).
- **Optimistic rollback untouched** — `useRevokeCustomerPortalAccessToken`'s `onError` path is unmodified; `confirmingId` is cleared before `mutate` fires so the row reverts cleanly to default state on error.
- **Test suite** covers all four `revokeConfirmPrompt` copy variants, Escape + focus return, multi-row switching, Cancel, generate/copy independence, and error state coexistence with the latest-link controls. Open question 4 from the proposal (the four test variants) is confirmed addressed.
- **All AGENTS conformance rules honored** — no Supabase from UI, no schema changes, no new hooks, no API route changes, no token hash or raw credential exposed.

---

## Interaction / state issues

**1. Cancel click does not return focus to the Revoke button.**

`cancelRevokeConfirmation()` is called with no argument on the Cancel button's `onClick` (line 495):

```tsx
onClick={() => cancelRevokeConfirmation()}
```

Inside `cancelRevokeConfirmation` (lines 210–213):

```ts
function cancelRevokeConfirmation(tokenId?: string) {
  returnFocusTokenIdRef.current = tokenId ?? null;
  setConfirmingId(null);
}
```

With no `tokenId`, `returnFocusTokenIdRef.current` is set to `null`. The `useEffect` watching `confirmingId` (lines 139–148) then finds `returnFocusTokenIdRef.current === null` and skips the focus-return call. Focus lands on `document.body`.

The Escape path via `handleConfirmKeyDown(event, token.id)` passes the token ID correctly and does return focus.

**Fix:** line 495 — pass the token ID:

```tsx
onClick={() => cancelRevokeConfirmation(token.id)}
```

This makes Cancel and Escape behave identically for keyboard/AT users.

---

## Visual / copy issues

**2. "Revoking..." uses three ASCII periods instead of an ellipsis character.**

Line 455: `Revoking...`
Proposal copy bank: `Revoking…` (U+2026)

The generating spinner on line 341 uses `"Generating..."` (three periods) — so this is consistent with the existing convention in the file. Accept as-is or fix both to `…` together in a single cosmetic pass; not worth a standalone patch.

---

## Scope drift

None. The implementation is tightly scoped to `customer-portal-links.tsx` and its test. No new hooks, no API changes, no domain-package changes. `customers-client.tsx` and `customers-client.test.tsx` are also modified in the working tree but those changes appear to be pre-existing cleanup from the 003/share-resend slices — not introduced by this slice.

---

## Out of scope (parked, OK)

- **Undo toast after revoke** — correctly deferred; no toast primitive present.
- **No-expiration extra warning in the amber zone** — correctly deferred to keep V1 compact.
- **Revoke-all** — not attempted; out of scope.
- **Persistent `revoked_by` / `revoked_at` fields** — not attempted; requires schema change.
- **Customer-list portal-ready badge** — not attempted; separate slice.

---

## Verification needed after fixes

- **Issue 1 (Cancel focus):** after applying the fix, click Cancel with a mouse and confirm focus lands on the triggering Revoke button. Then tab through multiple active-link rows, open a confirmation with Enter, and confirm Cancel returns focus to the correct row's Revoke button. Run the existing Escape test and confirm the new Cancel test passes.

---

## Test gap to close

The existing "cancels and switches revoke confirmations" test (line 234) clicks Cancel and asserts the zone disappears but does not assert focus. Add a focused variant alongside the Escape test:

```ts
it("returns focus to Revoke button when Cancel is clicked", async () => {
  const user = userEvent.setup();
  render(<CustomerPortalLinks customerId="customer-1" />);

  await user.click(
    screen.getByRole("button", {
      name: "Revoke portal link created May 6, 2026",
    }),
  );
  await user.click(screen.getByRole("button", { name: "Cancel revoke" }));

  await waitFor(() =>
    expect(
      screen.getByRole("button", {
        name: "Revoke portal link created May 6, 2026",
      }),
    ).toHaveFocus(),
  );
});
```

---

## Suggested ordering

1. **Issue 1 + test gap** — one-line fix on line 495 (`cancelRevokeConfirmation(token.id)`) plus the new test case. Highest-confidence UX fix; keyboard and screen-reader users are currently left with no focus after clicking Cancel.
2. **Issue 2 (ellipsis)** — bundle with the first patch or skip; entirely cosmetic.
