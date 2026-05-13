# Critique: Portal Share / Resend V1 (post-implementation)

Reviewed: `2e7ab89` ("feat: polish portal share workflow"). Implementation lives in `apps/web/app/customers/customer-portal-links.tsx`, `apps/web/app/customers/customer-portal-links.test.tsx`, `apps/web/hooks/useCustomerPortalAccess.ts`.

## What's correct against the proposal

- Three-zone layout implemented: share readiness card → generate+share action area → token audit list, stacked in the order the proposal specified.
- Section heading `Portal access` and subtitle `Generate links to share the customer portal.` are exact matches.
- Readiness card covers all required states: no tokens, active+opened (emerald border-left), active+never-opened (amber border-left), multiple active (amber border-left), no active links, loading, and error — each with the correct label and body copy (modulo the copy drifts noted below).
- Error state surfaces a `Retry` button that calls `tokensQuery.refetch()` — matches the proposal.
- Loading state renders two `h-12 animate-pulse rounded bg-gray-100` skeleton rows with `data-testid="portal-link-skeleton"` — exact match.
- `latestLink` lives in `useState` and is cleared on unmount/reset; never written to localStorage, sessionStorage, or the server — session boundary preserved.
- Clipboard-available path: confirm message + `Copy again` + `Generate new` buttons in the layout specified.
- Clipboard-unavailable path: read-only `<input>` with `onFocus={(event) => event.currentTarget.select()}`, `Copy` button, and helper text `Paste this into an email or text to share with the customer.` — all per proposal.
- Session boundary notice rendered with `mt-2 text-xs italic text-gray-400`.
- `newestFirst()` sort confirmed; `activeTokens()` helper isolates active subset for readiness logic.
- Token rows render: state dot (emerald/gray-400), state label, expiry text, opened text, and `Revoke` button (red border) for active rows only.
- `"Active - no expiration"` variant handled for tokens without `expires_at`.
- `formatOpened()` produces `"Opened [date]"` or `"Never opened"` — matches proposal copy bank.
- Optimistic revoke update with rollback on error is in `useCustomerPortalAccessToken`: `onMutate` snapshots, `onError` restores, `onSettled` invalidates — correct implementation.
- `Revoking...` disabled state for the in-flight revoke button.
- Inline generate error and revoke error both rendered below their respective UI zones.
- All data via `useCustomerPortalAccessTokens`, `useCreateCustomerPortalAccessToken`, `useRevokeCustomerPortalAccessToken` — no direct Supabase calls from the component.
- Domain helpers (`getCustomerPortalAccessTokenState`, `getCustomerPortalAccessTokenLabel`, `getCustomerPortalAccessTokenReadinessSummary`) used correctly; no new domain helpers added, matching the proposal's prediction.
- `timeZone: "UTC"` added to `Intl.DateTimeFormat` — good defensive fix not in the proposal.

## Visual / copy issues

1. **Em dashes replaced by hyphens throughout.** The proposal's copy bank specifies em dashes in three labels; the implementation uses plain hyphens for all three:
   - `"Shared — not yet opened"` → `"Shared - not yet opened"` (readiness card label, line ~183)
   - `"Active — no expiration"` → `"Active - no expiration"` (`tokenRowLabel`, line ~84)
   - `"Link ready — copy it manually:"` → `"Link ready - copy it manually:"` (action area, line ~253)
   Fix: replace the three string literals with em dashes (`—`). The test file asserts the hyphen versions so tests will need updating alongside the component.

2. **Checkmark missing from clipboard confirm message.** Proposal copy bank: `✓ Link copied to clipboard.` Implementation renders `Link copied to clipboard.` with no leading `✓` (line ~243). One-character fix — either embed the glyph directly or use `<span aria-hidden="true">✓</span>` if you prefer markup separation.

3. **Contractions stripped consistently across all three error strings.** Proposal used `"Couldn't"` in three places; implementation uses `"Could not"` throughout:
   - `"Couldn't load portal links."` → `"Could not load portal links."` (readiness card label)
   - `"Couldn't generate portal link. Try again."` → `"Could not generate portal link. Try again."` (inline error, line ~303)
   - `"Couldn't revoke link. Try again."` → `"Could not revoke link. Try again."` (inline error, line ~307)
   The formal register of "Could not" clashes with the rest of the copy. Restore contractions; update the three matching test assertions at the same time.

4. **"Shared — not yet opened" body copy drifted.** Proposal: `"A portal link was sent but hasn't been opened."` Implementation: `"A portal link exists but has not been opened."` Different verb ("exists" vs "was sent") and contractions stripped. "Was sent" implies an intentional admin action; "exists" is passive and less informative for office staff deciding whether to follow up.

5. **Session notice lost its contraction.** Proposal: `"…Reload the page and it's gone…"` Implementation: `"…Reload the page and it is gone…"` Consistent with the pattern in issue 3; fix alongside the contraction sweep.

## Interaction / state issues

6. **`Copy again` does not flash `Copied!` for 1.5 s.** Proposal: clicking `Copy again` shows `Copied!` on the button label for 1.5 s then reverts to `Copy again`. Implementation: `copyLatestLink()` sets `message` to `"Link copied to clipboard."` immediately and leaves it — no transient state. The button label always reads `Copy again` regardless of whether a copy just succeeded. Fix: add a `copying` boolean state; in `copyLatestLink` set it `true` then `setTimeout(() => setCopying(false), 1500)` (with a `clearTimeout` cleanup ref to avoid stale-update warnings on unmount). Conditionally render `Copied!` / `Copy again` on that flag.

7. **`Generate new` does not scroll-focus the date input.** Proposal: clicking `Generate new` resets link state *and* scrolls focus back to the date input. Implementation calls `resetLatestLink()` which only clears state — no scroll or focus side effect. On tall customer panels the generate area scrolls out of view, leaving the user with an empty action zone after clicking `Generate new`. Fix: attach a `useRef` to the date `<input>` and call `ref.current?.scrollIntoView({ behavior: "smooth" })` inside `resetLatestLink`.

8. **All revoke buttons disable simultaneously when any single revoke is in flight.** Proposal: "only one `Revoking…` button active at a time; others remain enabled (existing `revokeToken.isPending` is per-mutation)." In practice `useRevokeCustomerPortalAccessToken` returns one shared mutation, so `disabled={revokeToken.isPending}` (line ~371) freezes every `Revoke` button the moment any one token is being revoked. For customers with multiple active tokens this is a tangible UX gap — you can't queue a second revoke while the first settles. Fix options: (a) track pending state per token id inside the hook using a `Set<string>`, or (b) accept the constraint and update the proposal note to reflect reality. Option (b) is cheaper for V1 and safe given that multi-active-token customers are uncommon; option (a) is the correct long-term fix.

## Scope drift

9. **"Portal readiness" badge strip added as an unrequested fourth zone.** Between the generate action area and the token audit list the implementation inserts a full card labeled `Portal readiness` (uppercase, letter-spaced) containing four chip badges: `N active links`, `N expired`, `N revoked`, `N never opened` (lines 337–355). This block does not appear in the proposal's three-zone layout diagram. The `readinessSummaryItems` helper was intended to feed the readiness card logic, not to power a separate aggregate strip. Two problems:
   - It duplicates information already conveyed by the readiness card label and the audit list rows, adding visual noise without adding new signal.
   - During loading, `tokens` falls back to `[]`, so the badge strip renders `0 active links / 0 expired / 0 revoked / 0 never opened` while the readiness card simultaneously shows `Loading portal status…` — the two zones are contradictory.
   Recommendation: remove the badge strip. If aggregate counts prove useful to ops staff, fold the active count into the readiness card body (it's already in the label) and surface expired/revoked counts as an audit list header or section count rather than a separate card.

## Out of scope (parked, OK)

- **Revoke confirmation dialog** — correctly deferred per codex-review.
- **Max-one-active-link enforcement** — deferred; multi-link readiness card copy covers the interim UX.
- **No-expiration special warning** — deferred; falls through to the active+never-opened path, which is acceptable.
- **Dismissible session notice** — shipped as always-on small text; localStorage-based dismissal correctly tagged for a later slice.
- **Email/SMS send, token expiry nudge, revoke-all, portal-opened event log, customer-list portal badge** — all correctly parked per codex-review and proposal follow-up list.

## Verification needed after fixes

- After restoring contractions and em dashes, run `pnpm test --filter customer-portal-links` — test string assertions need updating alongside the component strings.
- After implementing `Copy again` flash (issue 6): confirm the `setTimeout` is cleared on unmount via a cleanup ref to avoid `setState on unmounted component` warnings in tests.
- After removing the "Portal readiness" badge strip (issue 9): confirm the `readinessSummaryItems` helper is still exercised by other code paths, or that its test coverage is redirected — the first test case (`"lists portal token states"`) currently asserts `screen.getAllByText("2 active links").toHaveLength(2)`, which relies on the badge strip producing a second match.
- Manually verify on a customer with two active tokens: confirm the optimistic revoke rollback still works correctly once per-row pending state is introduced (issue 8 fix).
- Spot-check the loading state in a slow-network environment to confirm the badge strip's contradictory zeros are visible before removal.

## Suggested ordering

**Copy sweep (do together — 6 string changes + 3–4 test updates):**
Issues 1, 2, 3, 4, 5 — all string literals in the component. One commit, one test update pass.

**Medium (8–12 lines each):**
Issue 6 — `Copy again` flash (`useState<boolean>` + `setTimeout`/`clearTimeout`).
Issue 7 — `Generate new` scroll (`useRef` + `scrollIntoView`).

**Design decision before cutting:**
Issue 9 — "Portal readiness" badge strip. Confirm with the team whether the aggregate count chips are wanted; if not, a 15-line delete. If they are wanted, at minimum gate the strip on `!tokensQuery.isLoading && !tokensQuery.error` to fix the contradictory zeros.

**Architecture discussion (ticket for next portal slice):**
Issue 8 — per-row revoke pending. Safe to defer for V1; pick up when the multi-active-token case is validated in production.
