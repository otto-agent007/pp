# Portal Token Audit Schema/RLS V1 Brief

## Goal

Prepare the next slice for a Codex-owned schema/RLS implementation decision for persistent customer portal token audit events.

Claude should only advise on operator-facing implications of the reduced V1 audit timeline: generated, opened, and revoked events. Codex owns the schema, RLS, route design, event writes, tests, security review, migration approval, production application, and final implementation scope.

## Current State

Slice 007 produced UI guidance for an expandable per-token audit history in `CustomerPortalLinks`.

Codex accepted:

- A row-scoped `History` disclosure in the token audit list.
- A strict public metadata boundary.
- Session-only feedback staying separate from persisted events.
- V1 event candidates limited to server-observable lifecycle events: generated, opened, and revoked.

Codex deferred:

- Copy/manual-share persistence.
- Provider send/resend events.
- Materialized expired events.
- Retention/export policy.
- Aggregate customer audit views.
- Any schema, RLS, route, migration, or production mutation.

## Target Surface

- `/customers`
- `CustomerPortalLinks`
- Existing portal token rows and their future `History` disclosure.

## Guidance Needed

Please recommend:

- The clearest operator-facing V1 timeline for generated, opened, and revoked events only.
- Empty, loading, error, partial-history, and pre-audit-token states for the reduced V1 history drawer.
- Copy for derived expired state when no `expired` event exists.
- How to explain one-opened-event versus many-opened-events without exposing schema choices to admins.
- UI treatment if the audit route is unavailable, forbidden, or returns redacted/partial data.
- What should be visible in the row before expansion versus inside the expanded history.
- Which prior slice 007 copy should remain deferred until copy/manual-share/provider events exist.

## Constraints

- Follow `docs/AGENTS.md`.
- Claude must not design the database table, RLS policies, migrations, indexes, SQL, event-write routes, or Supabase implementation.
- No direct Supabase access from UI.
- All future data access must go through `packages/api-client` and authenticated route boundaries.
- Shared contracts must live in `packages/types` when Codex implements them.
- Business logic and event summary derivation belong in shared packages, not app components.
- No raw portal URL, access token, token hash, provider secret, webhook payload, service-role data, raw actor ID, IP address, user agent, internal note, or customer-unsafe metadata may appear in UI.
- No provider delivery or send/resend implementation is included.
- No migrations, RLS changes, route implementation, event writes, or production mutations are approved by this brief.

## Non-Goals

- Choosing the audit table schema.
- Choosing RLS policy text.
- Implementing event writes for token generation, portal open, or revoke.
- Persisting copied or manually shared events.
- Implementing provider send/resend or delivery events.
- Adding scheduler/sweep behavior for expired events.
- Adding customer-visible audit history.
- Adding exports, notes, filters, or aggregate audit views.

## Expected Claude Output

Please write `proposal.md` with:

- Reduced V1 timeline layout and copy.
- Row-collapsed versus expanded-history information hierarchy.
- Empty/loading/error/partial/pre-audit states.
- Deferred copy/events list for later slices.
- AGENTS conformance self-check focused on UI boundaries.
- Explicit out-of-scope items that remain Codex-owned.
