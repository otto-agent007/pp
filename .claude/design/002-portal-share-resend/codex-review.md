# Codex Review: Portal Share/Resend V1

## Adopt

- Use the three-zone structure: share readiness card, generate/share action area, and dense token audit list.
- Keep manual resend as copy/share only with no provider route, email/SMS setup, new secrets, or automatic sending.
- Preserve session-only raw link behavior; generated URLs stay in React state and are not persisted.
- Continue using existing React Query hooks and shared portal-token helpers.
- Improve opened/never-opened visibility, clipboard fallback, loading, error, and revoke-pending states.

## Adapt

- Use the current helper/export locations in `packages/domain` rather than forcing new helpers into a specific file.
- Keep component-local view state presentational; move any reusable portal-token classification to domain tests in a future slice if it grows.
- Make "Generate new" mean another link will be generated, not that older links are invalidated.

## Defer

- Revoke confirmation.
- Max-one-active-link enforcement.
- No-expiration special warning.
- Dismissible session notice.
- Revoke-all, provider sending, token expiry nudge, portal-opened event log, and customer-list portal badge.

## Reject

- Reconstructing or displaying old raw portal URLs from token summaries.
- Provider/email/SMS behavior in V1.
- Schema, RLS, service-role, or API security changes outside an approved backend slice.

## Next Recommendation

Implement Portal Share/Resend UI Polish V1 as a no-migration admin UI slice on `/customers`, then have Claude optionally write `critique.md` after reviewing the implementation.
