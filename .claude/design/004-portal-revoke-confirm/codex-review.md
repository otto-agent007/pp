# Codex Review: Portal Revoke Confirmation V1

## Adopt

- Add an inline confirmation step inside active portal token rows.
- Use a single open confirmation at a time.
- Keep the existing revoke mutation, optimistic rollback, API route, hooks, and token schema unchanged.
- Preserve the generate/copy/manual-share area while confirmation is open.
- Add prompt copy that distinguishes no-expiration, expiration, never-opened, and opened states.
- Add focused tests for opening, canceling, confirming, Escape behavior, prompt variants, and unchanged generate/copy controls.

## Adapt

- Keep focus management simple: focus Cancel when the confirmation opens and return focus to the triggering Revoke button when Escape closes the zone where practical.
- Stop Escape propagation from the confirmation zone to avoid accidental parent keyboard handling.
- Use a small row ref map rather than a single Revoke ref if that keeps focus return deterministic across multiple token rows.
- Keep confirmation copy compact and defer extra no-expiration warnings unless the V1 UI still feels ambiguous.

## Defer

- Undo toast after revoke.
- Revoke-all flow.
- Persistent revoke audit fields such as `revoked_by` or `revoked_at`.
- Customer-list portal-ready badge.

## Reject

- Modal or popover confirmation for V1.
- Provider send/resend behavior.
- Migrations, RLS changes, new secrets, dashboard mutations, or production data changes.
- Raw token, token hash, service-role, provider payload, or internal storage exposure.

## Implementation Recommendation

Implement the confirmation in `CustomerPortalLinks` with local `confirmingId`, compact helper copy, deterministic focus refs, and no changes to hooks or API contracts. Verify with focused `customer-portal-links` tests plus the full repository verification gate before committing.
