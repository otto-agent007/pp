# Codex Review: Portal Token Audit Events V1

## Adopt

- Keep the audit-event UI row-scoped inside `CustomerPortalLinks`, with the existing token audit rows remaining the default collapsed view.
- Use a one-row-at-a-time `History` disclosure so admins can inspect token history without making `/customers` dense or noisy.
- Preserve the visual distinction between current token state in the collapsed row and historical events in the expanded timeline.
- Keep session-only UI feedback, especially `Copied!`, `latestLink`, and revoke confirmation state, visually and conceptually separate from persisted audit events.
- Require all event reads to flow through React Query hooks, `packages/api-client`, authenticated server routes, and server-only Supabase access.
- Preserve the strict UI-facing metadata boundary: no raw portal URLs, access tokens, token hashes, service-role fields, provider secrets, webhook payloads, IP addresses, user agents, raw actor IDs, or internal notes.
- Use partial-history and empty-history states so admins can tell the difference between "no events exist" and "older events are outside the retention window."

## Adapt

- Treat `generated`, `opened`, and `revoked` as the only likely V1 persistent event candidates because they are server-observable lifecycle events.
- Treat `copied` as session-only until a future product decision explicitly approves an admin-authenticated event-write route. Clipboard success alone is not enough to justify persistence in the schema/RLS slice.
- Treat `manually_shared` as a future explicit admin action, not an inferred event. Do not render a "mark as shared" control in this audit-events slice unless that behavior is separately approved.
- Treat `expired` as derived token state for V1 unless a later scheduler/sweep design is approved. Do not imply a background expiry event exists if no job writes it.
- Keep actor display names pre-resolved server-side, but define the public contract as display-only summary fields rather than forwarding raw profile IDs or provider/user metadata.
- Prefer a customer-scoped event query or token-list enrichment only after performance and payload size are checked; avoid per-token request fanout if many rows are visible.
- Move event label formatting and public summary derivation into shared code (`packages/domain`) only when implementation begins. This proposal is design input, not permission to add types/routes now.

## Defer

- Supabase event table, RLS policies, indexes, triggers, retention policy, event-write routes, and production migration work.
- Customer portal access-route writes for discrete `opened` events.
- Admin-generated writes for `copied` or `manually_shared`.
- Provider-backed `send_attempted`, `send_succeeded`, `send_failed`, and `provider_blocked` events until the send/resend provider boundary exists.
- Timeline filtering, CSV/PDF export, aggregate customer audit view, per-event notes, deep links, and customer-visible audit history.
- Decisions about retention window, eager vs lazy expiry materialization, and single-row vs multi-row expansion beyond V1.

## Reject

- Persisting raw portal URLs, clipboard values, raw access tokens, token hashes, provider message IDs, webhook payloads, service-role-only fields, IP addresses, user agents, raw actor IDs, or internal note text in UI-facing event responses.
- Writing `copied` events automatically from the current clipboard-only flow in this slice.
- Adding provider delivery, send/resend buttons, delivery retries, provider status rows, or webhook behavior as part of audit-event UI planning.
- Treating Claude's event taxonomy or TypeScript shape as schema approval.
- Adding migrations, RLS changes, production mutations, or scheduled jobs without explicit approval.
- Adding direct Supabase reads from `CustomerPortalLinks` or any UI component.

## Next Codex Implementation-Plan Recommendation

Do not implement audit events from this proposal yet. The next safe slice is a schema/RLS planning slice:

1. Define the minimal event table for admin-only portal token lifecycle events.
2. Limit V1 writes to server-observable lifecycle points: generated, opened, and revoked.
3. Define a UI-safe summary response that excludes raw tokens, hashes, provider data, IP addresses, user agents, raw actor IDs, and internal notes.
4. Decide retention and whether `expired` remains derived or becomes a materialized event.
5. Add tests for event write boundaries, route filtering, metadata redaction, and UI empty/loading/error/history states.
6. Run security-sensitive review before any migration or production application.

Until that schema/RLS slice is explicitly approved, keep this proposal as design guidance only.
