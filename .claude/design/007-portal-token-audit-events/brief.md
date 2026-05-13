# Portal Token Audit Events V1 Brief

## Goal

Plan the UI and interaction guidance for a future persistent portal token audit event log on `/customers`, centered on `CustomerPortalLinks`.

The goal is to help admins understand how a customer portal link has been handled over time: generated, copied or manually shared when knowable, opened by the customer, revoked, expired, and failed or blocked future delivery attempts. Codex will own schema, RLS, API routes, event writes, data access, tests, security review, GitHub stewardship, and final scope control.

## Current State

Admins can:

- Generate a customer portal access link.
- Copy the generated link during the current browser session.
- Manually share the link outside the app.
- See token rows with active, expired, revoked, never-opened, opened, no-expiration, and created-at state.
- Revoke active links through an inline confirmation flow.
- See no-provider contact readiness when no stronger portal state is dominant.

The current implementation does not persist copy/share events, delivery attempts, or a token event timeline.

## Target Surface

- `/customers`
- `CustomerPortalLinks`
- The existing token audit list and any compact per-token detail treatment.

## Guidance Needed

Please recommend:

- A compact information hierarchy for persistent token events without crowding the existing token rows.
- Event labels and copy for generated, copied, manually shared, opened, revoked, expired, send attempted, send succeeded, send failed, and provider blocked.
- Which events should appear in a collapsed token row versus an expanded detail area.
- Empty, loading, error, and partial-history states.
- How to distinguish persisted server events from session-only UI feedback like "Copied!".
- How to display event actor/channel metadata without exposing service-role details, raw tokens, provider secrets, token hashes, internal notes, or customer-unsafe data.
- How the design should behave before provider-backed send/resend exists.

## Constraints

- Follow `docs/AGENTS.md`.
- No direct Supabase access from UI.
- All data access must go through `packages/api-client` and route boundaries.
- Shared contracts must live in `packages/types`.
- Business logic belongs in shared packages, not app components.
- No raw token, token hash, reset link, service-role data, provider secret, webhook payload, or internal note exposure.
- No provider delivery is included in this planning slice.
- Treat schema/RLS changes as a future explicit implementation decision requiring approval and security review.
- Keep mobile offline behavior out of scope for this web admin slice.

## Non-Goals

- Implementing the audit event table, migrations, RLS, API routes, or event writes in this planning slice.
- Implementing email, SMS, webhook, queue, or notification delivery.
- Persisting raw portal URLs or copied clipboard values.
- Changing token authorization, hashing, expiration, revoke behavior, or customer portal access rules.
- Adding customer contact fields.

## Expected Claude Output

Please write `proposal.md` with:

- Recommended layout for token audit events in `CustomerPortalLinks`.
- Event copy and state labels.
- Collapsed and expanded row behavior.
- Empty, loading, error, and partial-history states.
- AGENTS conformance self-check.
- Follow-ups and explicitly out-of-scope items.
