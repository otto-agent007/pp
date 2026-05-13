# Claude Design Brief: Portal Share/Resend V1

## Summary

Create UI/design recommendations for improving customer portal sharing on the admin customer screen. Codex will own implementation, data flow, tests, architecture boundaries, and GitHub stewardship. Claude should focus on compact operations-focused hierarchy, copy, interaction flow, and state treatment for portal-link sharing, resend/copy readiness, and token audit visibility.

## Target Screens

- `/customers`: active customer detail panel, especially `CustomerPortalLinks`.
- Optional context around the customer ledger/portal handoff copy if it helps the portal-link panel feel less isolated.

## Current State

Admins can already:

- Generate a customer portal access token with an optional expiration date.
- Automatically copy the newly generated portal URL when the clipboard is available.
- Copy the latest generated portal URL during the current page session.
- List portal link summaries for active, expired, revoked, and never-opened links.
- See created, expiration, last-used, and state details for each token.
- Revoke active portal links.

Important implementation detail: raw portal tokens are only returned at generation time. Persisted token records expose summaries, not reusable raw token values.

## User Goal

Office users need to quickly answer:

- Is this customer ready for portal sharing?
- Which portal link is currently safe to share?
- Has the customer opened a portal link yet?
- Which links are expired or revoked?
- What should I do next: generate, copy/share, resend manually, or revoke?

## Design Ask For Claude

Recommend a compact customer-detail panel flow for:

- Portal share readiness and token audit summary.
- Clear primary action hierarchy for generate, copy/share, manual resend, and revoke.
- A state model for active, expired, revoked, never opened, recently opened, generated, copied, clipboard unavailable, revoke pending, loading, empty, and error states.
- Concise admin-facing copy for labels, helper text, empty states, error states, and button labels.
- Dense but readable token rows suitable for repeated office use.

## Constraints And Guardrails

- No schema changes, migrations, RLS changes, provider setup, email/SMS setup, dashboard mutations, production data changes, or new secrets.
- No automatic sending in this slice. Treat "resend" as UI guidance for a future/manual share affordance unless Codex later implements a provider-approved server route.
- No direct Supabase calls from UI components. UI must continue through React Query hooks, `packages/domain`, and `packages/api-client`.
- Do not persist, display, or reconstruct raw token values after initial generation.
- Do not expose service-role behavior, token hashes, provider ids, internal notes, or raw storage paths.
- Preserve the customer-safe portal boundary: customer ids alone are not authorization.
- Keep the design utilitarian and field-office friendly, not marketing-like.

## Expected Claude Output

- Recommended information hierarchy for the `/customers` portal-link panel.
- Suggested readiness/audit summary treatment and token-row layout.
- Primary and secondary actions per state.
- Copy bank for status labels, helper text, empty/error states, and buttons.
- Interaction flow for generate, copy, manual resend/share, and revoke.
- Notes on loading, generated, copied, clipboard unavailable, error, active, expired, revoked, never-opened, recently opened, and revoke-pending states.
- AGENTS conformance self-check.
- Follow-up ideas that are useful but out of scope for V1.

## Non-Goals

- Building the implementation.
- Designing database access, migrations, RLS policies, provider delivery, email/SMS templates, or production dashboard changes.
- Adding a standalone customer portal admin page.
- Changing token security semantics or storing raw portal links beyond the current generation session.
- Customer-facing portal redesign.

## Assumptions

This is the next UI-heavy follow-up after the Portal + Ledger batch. Claude's proposal is advisory; Codex will adapt useful hierarchy, copy, state maps, and interaction guidance to existing components, tests, and no-migration constraints.
