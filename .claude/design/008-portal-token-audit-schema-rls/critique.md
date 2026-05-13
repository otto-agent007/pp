# Critique: Portal Token Audit Schema/RLS V1 (pre-implementation design audit)

Reviewed: no implementation commits exist. The codex-review explicitly held slice 008 at design-guidance only: "the next safe step is a Codex-owned schema/RLS implementation plan, not code yet." This critique audits the proposal and codex-review as a design package for implementation-readiness rather than comparing built code against the proposal.

Relevant live files: `apps/web/app/customers/customer-portal-links.tsx`, `packages/domain/closeouts.ts`, `packages/api-client/portal.ts`, `apps/web/hooks/useCustomerPortalAccess.ts`.

---

## What's correct against the proposal

- The reduced V1 scope (generated, opened, revoked only) is internally consistent throughout the proposal: copy bank, state map, AGENTS conformance table, open questions, and deferred items all hold the same boundary.
- The one-row-at-a-time `expandedTokenId: string | null` state model is well-motivated and avoids compounding per-token fetches during token list renders.
- The `enabled: false` default on `useCustomerPortalAccessTokenEvents` correctly gates the query behind user interaction and matches the existing pattern in `useCustomerPortalAccessTokens`.
- The per-token query key `["customer-portal-access-token-events", tokenId]` is correctly isolated so a revoke on token A does not invalidate token B's history cache.
- The `truncated_before` contract is a sound public API boundary: it lets the server communicate retention windows and pre-audit token gaps without exposing schema choices.
- Derived expired state stays in the collapsed row only, with no synthetic `expired` drawer item — correct given no materialized event write exists.
- All eight open questions are genuinely pre-implementation decisions that belong to the schema/RLS slice. None should be resolved unilaterally by UI code.
- The deferred copy list is exhaustive and matches the codex-review's reject list.
- The AGENTS conformance table is complete and consistent with the reject section of the codex-review.

---

## Factual errors in the proposal

1. **Wrong line reference for `useRevokeCustomerPortalAccessToken`.**
   Proposal states: "In `useRevokeCustomerPortalAccessToken` (currently at line 115 of `useCustomerPortalAccess.ts`)". The function actually begins at **line 37** of that file. The hook file is 75 lines total; line 115 does not exist. Fix this before handing the proposal to a Codex implementation slot — stale line numbers cause disorientation during PR reviews.

2. **Collapsed-row label source described loosely.**
   Proposal states: "State dot + label: derived by `getCustomerPortalAccessTokenState()` in `packages/domain/closeouts.ts` (line 388)." The collapsed row in `customer-portal-links.tsx` actually calls `tokenRowLabel(token)` (line 63), a local helper that calls `getCustomerPortalAccessTokenLabel()` from `@pest-patrol/domain`, not `getCustomerPortalAccessTokenState()` directly. `getCustomerPortalAccessTokenState()` is a dependency of the label function, not the direct source. This is a documentation precision issue, not a design flaw, but the proposal's section-by-section breakdown should name `tokenRowLabel()` and `getCustomerPortalAccessTokenLabel()` as the actual call chain.

3. **Wireframe "Active" vs. implementation "Active — no expiration".**
   The collapsed-row wireframe shows a simple `Active` label for the no-expiry active case. `tokenRowLabel()` in `customer-portal-links.tsx` (line 66-70) already returns `"Active — no expiration"` for this case. The wireframe is a simplified illustration, not a verbatim rendering — but if the proposal is being used as a rendering spec, "Active" and "Active — no expiration" are different strings. The copy bank should include `Active — no expiration` as the existing collapsed-row label (it is not currently listed). No fix needed to the implementation; the copy bank needs the addition.

---

## Design gaps to resolve before implementation

4. **Query lifecycle on token list invalidation with an open drawer.**
   The proposal specifies that `expandedTokenId` lives in `CustomerPortalLinks` state. When `useRevokeCustomerPortalAccessToken` settles and invalidates `customerPortalAccessTokensQueryKey`, the token list re-fetches. If the revoked token disappears from the response, `expandedTokenId` may still hold its ID — pointing at a row that no longer renders. The proposal describes revoke-while-open correctly for the events query (refetch → new revoked event appears), but does not address the case where the token itself is removed from the list. Implementation should clear `expandedTokenId` if the previously expanded token ID is no longer present in the refreshed token list. One guard in a `useEffect` watching `sortedTokens` is sufficient.

5. **`▾ History` button placement relative to Revoke for non-active tokens.**
   The proposal's wireframe shows `▾ History` on all token rows (active, expired, revoked). For expired and revoked tokens, the `[Revoke]` button is absent (correct per current code at `customer-portal-links.tsx:473`). But the proposal's layout note says the button group is `<div className="flex shrink-0 items-center gap-1">` containing `▾ History` and (if active) `[Revoke]`. This means the group renders for all rows unconditionally, with `[Revoke]` conditionally present. That's the right model, but the current line 2 of non-active rows in `customer-portal-links.tsx` (line 469-471) renders only the expiry/opened text with no right-side group at all. Codex will need to add the right-side group for non-active rows too, not just wrap the existing revoke button for active rows. Flag this for the implementation plan so it isn't an afterthought.

6. **Escape-to-collapse keyboard handler and focus return.**
   The proposal specifies Escape collapses the drawer and returns focus to the `▾ History` toggle. This is the right pattern. However, the proposal says this "matches the existing revoke-confirm keyboard handler pattern at line 229." The `handleConfirmKeyDown` at line 228 handles Escape by calling `cancelRevokeConfirmation(tokenId)` which sets a `returnFocusTokenIdRef` and then clears `confirmingId`. The focus is returned to the revoke button via a `useEffect` watching `confirmingId` (line 144-154). The history drawer Escape handler will need an analogous `returnFocusHistoryToggleRef` or similar mechanism — it cannot reuse the revoke-confirm ref because the history toggle is a different button. Implementation should add a parallel focus-return path, not try to share the existing `cancelRevokeRef`/`revokeButtonRefs` structure.

---

## Scope drift

None. The codex-review held the full scope boundary and no commits advanced any part of slice 008 into code. The `useCustomerPortalAccess.ts` hook file, `packages/api-client/portal.ts`, `packages/domain/closeouts.ts`, and `packages/types/index.ts` are all unchanged from pre-slice-008 state. No drift to report.

---

## Out of scope (parked, OK)

- Schema design, RLS policy text, indexes, migrations, event-write routes, production application — correctly held by codex-review.
- `copied`, `manually_shared`, `expired`, send/resend events, channel metadata, delivery reason copy — correctly deferred in both the proposal and codex-review.
- Optimistic append of `revoked` events into the events cache — codex-review deferred this to "start with invalidation/refetch unless implementation evidence suggests otherwise." Proposal open question 7 captures this correctly.
- Retention window choice — open question 8, correctly unresolved. The `truncated_before` field in the response shape supports any retention policy without UI changes.
- All eight open questions remain correctly open. None should be resolved in the UI implementation slot; they belong in the Codex schema/RLS implementation-plan document.

---

## Verification needed before implementation begins

- Correct the `useRevokeCustomerPortalAccessToken` line reference (line 37, not 115) in the proposal's hook sketch section.
- Add `Active — no expiration` to the copy bank as the existing collapsed-row label for no-expiry active tokens.
- Confirm with Codex that the implementation plan will explicitly resolve open questions 1 (opened storage model) and 2 (generated event write atomicity) before any schema work begins — these two decisions directly affect the shape of the events API response and the drawer's rendering correctness.
- Confirm the implementation plan includes a `useEffect` guard to clear `expandedTokenId` if the expanded token ID disappears from the refreshed token list (design gap 4 above).
- Confirm the implementation plan adds the right-side button group to non-active token rows as a prerequisite for placing `▾ History` (design gap 5 above).

## Suggested ordering for implementation

The schema/RLS implementation plan should resolve open questions 1, 2, and 5 (opened model, event write atomicity, 403 source) before any code is written. UI work can then proceed in this order:

1. Add `expandedTokenId` state and `▾ History` toggle to `CustomerPortalLinks` (no API dependency — can use a mock/empty drawer for visual review).
2. Add types to `packages/types`, api-client function to `packages/api-client/portal.ts`, domain pass-through to `packages/domain/closeouts.ts`, and hook to `useCustomerPortalAccess.ts` — all blocked on schema/RLS sign-off.
3. Wire the live query into the expanded drawer with all states (loading, empty, partial, error, forbidden).
4. Add cache invalidation on `useRevokeCustomerPortalAccessToken.onSettled` and the `expandedTokenId` clear guard.
5. Keyboard/ARIA pass: Escape handler, `aria-expanded`, `aria-controls`, region label.
