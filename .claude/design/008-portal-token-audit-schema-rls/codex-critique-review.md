# Codex Critique Review: Portal Token Audit Schema/RLS V1

## Valid fixes

- Corrected the implementation-facing event copy to match the reduced V1 guidance: `Link generated`, `Opened by customer`, and `Revoked`.
- Kept `History` available on active, expired, and revoked token rows by rendering the history control independently from the revoke action.
- Added a guard that clears the expanded history row if the refreshed token list no longer contains that token.
- Preserved the public `truncated_before` response shape through the API client/domain/hook path so the drawer can show partial or pre-audit history context.
- Added ARIA wiring for the history disclosure and an Escape-to-collapse path with focus returning to the history toggle.

## Deferred follow-ups

- Actor display names remain reduced to admin-safe generic copy in V1. Profiles currently do not expose display names, and the UI still avoids raw actor IDs.
- Retention policy remains `truncated_before: null` until a later retention/pre-audit policy is explicitly approved.
- Optimistic insertion of a local revoked event remains deferred; the hook invalidates the per-token events query after revoke.

## Rejected/out-of-scope items

- No copy/manual-share, provider send/resend, provider delivery, materialized expired event, export, aggregate audit view, or customer-visible audit history was added.
- No production migration was applied.
- No raw portal URL, access token, token hash, actor ID, IP address, user agent, service-role field, provider payload, or internal note is returned to the UI.

## Verification needed

- Re-run focused tests for the API client, domain helpers, and `CustomerPortalLinks`.
- Re-run full typecheck, lint, test, build, and `git diff --check` after the critique fixes.
