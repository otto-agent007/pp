# Codex Critique Review: Portal Send/Resend Provider Boundary V1

## Valid findings

- The critique correctly identifies that `POST /api/portal/access-tokens/send` persists `send_requested` and `send_failed` events, and `CustomerPortalTokenHistory` renders every returned event through `getCustomerPortalAccessTokenEventLabel`. This is now accepted product scope because `tasks/done.md` records provider-safe send attempt audit events as implemented; the cleanup should align UX and tests around those durable events rather than remove the writes.
- The `sendNewLink` row action really generates a fresh token, copies it into `latestLink`, sets top-level copy messaging, and calls `setSendRequested(true)`. The critique is right that this creates cross-zone feedback: a row action can update the top post-generation area.
- The fresh-token row action can leave the previous token active because it calls `createToken` and does not revoke the old token. The `Send new link` label is more accurate than `Resend`, but the operator needs clearer copy that a fresh active link is being created.
- Focus after successful top-level send is not managed. The send button can disappear into `Send requested` text without an explicit focus target.
- The clipboard-unavailable path wraps `sendButton` in an unstyled `div`; this is a valid responsive-layout polish risk.
- Provider-status copy inside the readiness card is valid but visually secondary. Lighter treatment or separation would reduce confusion.

## Deferred or lower-priority polish

- Standardizing `...` to typographic ellipses is polish only. It should not block the provider boundary decision.
- Partial contact copy, resend cooldowns, send channel display, provider onboarding nudges, and persistent per-token send status remain future UX slices.
- Auto-revoking the old token after `Send new link` is a behavior change with security and audit implications. Do not take that path without an explicit implementation plan.

## Out of scope or non-actionable

- Do not mutate schema, RLS, provider configuration, secrets, environment variables, dashboards, or production data in response to this critique alone.
- Do not expose raw portal URLs, access tokens, token hashes, service-role fields, provider secrets, provider payload internals, raw actor IDs, IP addresses, user agents, or internal notes in UI.
- The automation notification delivery route uses the separate notification delivery provider path. It should be kept independent from portal send unless a future slice intentionally unifies provider behavior.

## Verification needed after fixes

- Verify a sent token history drawer and confirm `Send requested` / `Send failed` render without exposing provider payloads, raw portal URLs, raw actor IDs, IP addresses, user agents, internal notes, token hashes, or service-role data.
- Click `Send new link` on an existing active token and verify the post-generation area no longer changes unless that behavior is intentionally kept.
- Verify operator copy around fresh-link creation makes it clear that the old active link remains active.
- Keyboard-test successful `Send link` and confirm focus lands on a stable nearby control.
- Check the clipboard-unavailable path on a narrow viewport with provider delivery enabled.
