# Codex Critique Review: Portal Token Audit Events V1

## Valid fixes

- Clarify that the proposal's TypeScript interfaces, hook names, route paths, and API-client/domain signatures are a proposed contract sketch only, not approved implementation scope.
- Mark `copied` and `manually_shared` copy and event taxonomy as deferred-kind guidance until explicit event-write behavior is approved.
- Add a V1 reduced timeline target for `generated`, `opened`, and `revoked` only.
- Clarify V1 `expired` handling: keep it as derived collapsed-row state, absent from the event timeline until a scheduler/sweep or materialized event path is approved.
- Document why per-token event fetching is acceptable only under the single-row-open V1 policy, and when to revisit customer-scoped event loading.
- Preserve the `opened` granularity decision as a schema/RLS implementation choice: one synthetic event from `last_used_at` and one event per access are both renderable, but the schema slice must choose.
- Add an ARIA label fallback for missing or invalid `created_at` formatting.

## Deferred follow-ups

- Retention window and `truncated_before` policy.
- Whether `opened` becomes one event per access or a synthetic row from `last_used_at`.
- Whether `expired` should ever become a materialized event.
- Customer-scoped event loading if multi-row expansion is later approved.
- Copy/manual-share persistence, provider events, exports, aggregate audit views, notes, deep links, customer-visible audit history, and mobile rendering.

## Rejected/out-of-scope items

- No schema, RLS, indexes, triggers, migrations, event-write routes, scheduled jobs, provider delivery, or production mutations in this critique pass.
- No persistence of raw portal URLs, clipboard values, raw access tokens, token hashes, provider payloads, service-role-only fields, IP addresses, user agents, raw actor IDs, or internal notes.
- No direct Supabase access from UI components.

## Verification needed

- Treat the updated proposal as design input only.
- Before implementation, create or approve a separate schema/RLS slice that resolves retention, event granularity, expiry handling, event write boundaries, route filtering, metadata redaction, and security review.
- Re-run design critique after any implementation lands.
