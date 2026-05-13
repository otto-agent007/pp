# Codex Review: Portal Token Audit Schema/RLS V1

## Adopt

- Use the reduced V1 history drawer as the operator-facing target: generated, opened, and revoked only.
- Keep the collapsed token row as the current-state summary, using existing token summary fields for active/expired/revoked, created, expiry, and opened facts.
- Keep the expanded drawer focused on "who did what, and when" without repeating derived collapsed-row state.
- Render multiple opened events as repeated chronological `Opened by customer` rows if the future API returns multiple events, without exposing the underlying storage decision.
- Keep `expired` out of the V1 event timeline. The collapsed row's derived `Expired [date]` copy is the only V1 expired signal unless a later materialized event path is approved.
- Preserve the empty, loading, stale-while-revalidating, forbidden, generic error, partial-history, and pre-audit token states.
- Preserve the strict public metadata boundary: no raw portal URL, access token, token hash, provider payload, service-role data, raw actor ID, IP address, user agent, internal note, or customer-unsafe metadata.

## Adapt

- Treat the proposed hook/API/type sketches as non-binding implementation targets only. They are useful shape guidance, not approval to add routes, types, SQL, RLS, or event writes.
- Resolve the `opened` storage model in the Codex-owned schema/RLS slice before coding. The UI can render either one synthetic opened event or one event per access.
- Resolve `generated` and `revoked` event write atomicity in Codex implementation planning, not in Claude's UI proposal.
- Keep `truncated_before` and pre-audit behavior as a public contract goal, but choose the concrete retention policy in the schema/RLS slice.
- Consider per-token event fetching acceptable for V1 only because one row is open at a time. Revisit a customer-scoped endpoint if multi-row expansion or higher token volume is approved.
- Keep Escape-to-collapse as UI guidance to consider during implementation; do not let it disturb existing revoke confirmation keyboard behavior.

## Defer

- Supabase table design, RLS policy text, indexes, triggers, SQL, migrations, event-write routes, and production application.
- Security review for the portal audit event trust boundary.
- Copy/manual-share persistence, provider send/resend events, materialized expired events, scheduler/sweep behavior, exports, aggregate customer audit views, customer-visible audit history, notes, filters, and delivery failure callouts.
- Optimistic append of revoked events into the event cache; start with invalidation/refetch unless implementation evidence suggests otherwise.

## Reject

- Any direct Supabase access from `CustomerPortalLinks` or other UI components.
- Any UI-facing event response containing raw tokens, token hashes, raw actor IDs, provider identifiers, provider payloads, service-role-only fields, IP addresses, user agents, or internal notes.
- Treating this proposal as authorization to implement migrations, RLS, routes, event writes, provider delivery, or production mutations.
- Adding `copied`, `manually_shared`, `expired`, or provider event copy to V1 rendered output.

## Next Codex Implementation-Plan Recommendation

The next safe step is a Codex-owned schema/RLS implementation plan, not code yet. That plan should decide:

1. Event table shape for generated/opened/revoked only.
2. Whether `opened` is one event per access or synthetic from `last_used_at`.
3. How generated/revoked event writes stay atomic enough with existing token create/revoke routes.
4. Admin-only read boundaries and UI-safe summary fields.
5. Pre-audit and retention behavior for `truncated_before`.
6. Tests for route auth, customer scoping, metadata redaction, no raw-token exposure, and UI state rendering.
7. Whether explicit approval has been given for a migration/RLS slice before any SQL is created or applied.

Until that approval exists, keep this slice as design guidance only.
