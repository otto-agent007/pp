# Portal Send/Resend Provider Boundary V1 Brief

## Goal

Prepare the next Claude design relay slice for provider-approved portal send/resend guidance after the local portal token audit-events implementation.

Claude should advise only on operator-facing UI states, copy, and workflow expectations for a future provider-backed send/resend boundary. Codex owns provider selection, route design, secrets, database schema, RLS, event writes, security review, tests, implementation scope, and production mutations.

## Current State

- Manual portal link generation/copy/share exists in `CustomerPortalLinks`.
- Reduced V1 portal token audit history now supports generated, opened, and revoked events.
- Copy/manual-share persistence, provider send/resend events, delivery status, and provider setup remain deferred.
- The customer readiness UI can already show contact availability and active/expired/revoked token state.

## Target Surface

- `/customers`
- `CustomerPortalLinks`
- Existing portal token rows, readiness card, and future provider-send controls.

## Guidance Needed

Please recommend:

- The operator-facing send/resend workflow for a future provider-backed V1.
- Button placement and labels for send/resend without replacing manual copy fallback.
- Loading, success, retryable failure, provider-blocked, missing-contact, and partial-contact states.
- How send/resend status should coexist with the generated/opened/revoked history drawer.
- Which event copy should remain deferred until Codex explicitly implements provider delivery events.
- How to phrase delivery uncertainty without overpromising that a customer received or opened a message.
- Any accessibility or keyboard concerns for the send/resend controls.

## Constraints

- Follow `docs/AGENTS.md`.
- Claude must not choose the provider, implement provider calls, design secrets handling, create routes, write migrations, alter RLS, or approve production mutations.
- No raw portal URL, access token, token hash, provider secret, webhook payload, service-role data, raw actor ID, IP address, user agent, internal note, or customer-unsafe metadata may appear in UI.
- No direct Supabase access from UI.
- All future data access must go through `packages/api-client` and authenticated route boundaries.
- Shared contracts must live in `packages/types` when Codex implements them.
- Business logic and event summary derivation belong in shared packages, not app components.
- Manual copy fallback must remain available even after provider send/resend exists.

## Non-Goals

- Implementing provider delivery.
- Selecting email/SMS vendors.
- Creating send/resend routes.
- Creating migrations, RLS policies, or event writes.
- Persisting copy/manual-share events.
- Changing token hashing, expiration, revoke, or audit-event security boundaries.
- Applying any production database changes.

## Expected Claude Output

Please write `proposal.md` with:

- Recommended V1 UI flow and copy for provider-backed send/resend.
- State map for missing contact, in-flight, sent/queued, failed, blocked, and retry.
- Interaction between send/resend status and the existing audit history drawer.
- Deferred copy/events list for later slices.
- AGENTS conformance self-check focused on UI and data-boundary safety.
- Explicit out-of-scope items that remain Codex-owned.
