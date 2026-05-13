# Codex Review: Portal Send/Resend Provider Boundary V1

## Adopt

- Keep the no-provider path identical to today: no send/resend controls render unless Codex provides an explicit provider-enabled signal.
- Preserve manual copy as the reliable fallback before, during, and after any provider send/resend attempt.
- Use uncertainty-safe copy such as `Send requested`, not `Sent`, `Delivered`, or any wording that implies the customer received the message or opened the portal.
- Keep provider send/resend status outside the existing generated/opened/revoked history drawer until Codex explicitly implements provider delivery events.
- Keep contact-readiness states low priority so actual portal token state still dominates the readiness card.
- Use active-row-only `Resend` controls and keep revoke/history controls available during resend attempts.
- Keep accessibility requirements: row-scoped labels, in-flight state announcements, inline error alerts, and predictable focus return after success/failure.

## Adapt

- Treat `providerSendEnabled` as a Codex-owned capability flag or server-derived config, not a UI-only toggle.
- Route, provider, secret, rate-limit, throttle, and error-code design must be resolved before implementation. Claude's `POST /api/portal/send` sketch is a placeholder, not an approved route contract.
- Send status should not be presented as durable history unless it is backed by a durable server contract. Session-only feedback is acceptable in the post-generation panel, but token-row status across reloads needs an approved persistence model.
- `Send failed` and `Send blocked` can be useful operator states, but Codex must define their source and retry semantics before UI copy lands.
- Hidden versus disabled `Resend` for missing contact should be decided during implementation planning. The clean default is hidden, with the readiness card explaining the contact gap.
- Any future shared contracts belong in `packages/types`, behavior derivation in `packages/domain`, and fetch/mutation boundaries in `packages/api-client`.

## Defer

- Provider selection, provider configuration, secrets handling, webhooks, delivery polling, retry queues, and dashboards.
- Any migration, RLS policy, send-event table, send-status field, or production database application.
- Persistent `send_attempted`, `send_requested`, `send_failed`, `send_blocked`, `delivered`, `copied`, `manually_shared`, or `expired` events.
- Channel selection/display, send counts, resend cooldown UI, delivery receipt confirmation, provider onboarding nudges, and revoke-on-send behavior.

## Reject

- Any direct Supabase access from `CustomerPortalLinks` or other UI components.
- Any UI response or provider payload that exposes raw portal URLs, access tokens, token hashes, provider secrets, webhook payloads, service-role data, raw actor IDs, IP addresses, user agents, internal notes, or customer-unsafe metadata.
- Treating this design proposal as approval to implement provider delivery, routes, schema/RLS, event writes, or production mutations.
- Claiming delivery or receipt without a provider-confirmed delivery contract.

## Next Codex Implementation-Plan Recommendation

Do not implement provider send/resend from this proposal alone. The next safe step is an explicit Codex-owned implementation plan that decides:

1. Whether provider send/resend is approved for implementation now or remains design-only.
2. The provider capability flag source and runtime configuration boundary.
3. Route/auth shape and required request/response payloads.
4. Secret handling and provider error-code mapping.
5. Whether V1 send status is session-only, token-row persistent state, or a persisted audit event.
6. Rate limits, resend cooldowns, and blocked-vs-failed retry semantics.
7. Tests for no raw-token exposure, no provider secret exposure, missing-contact behavior, fallback copy preservation, and route auth.

Until that approval exists, keep slice 009 as UI guidance only.
