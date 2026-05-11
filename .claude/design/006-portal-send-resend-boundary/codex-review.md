# Codex Review: Portal Send/Resend Boundary V1

## Adopt

- Add a `customerContact` prop to `CustomerPortalLinks` using existing customer email/phone values already available in `customers-client.tsx`.
- Surface a compact "No contact saved" readiness state when there is no stronger active-link state, so admins understand manual share is the only current option.
- Keep the current manual generate/copy/share flow as the primary action path until a provider-approved route exists.
- Preserve the existing token audit density and revoke confirmation behavior.

## Adapt

- Treat all send/resend button placement, status labels, and failure/retry copy as future implementation guidance only.
- Do not render `Send link`, `Send`, `Resend`, `Retry`, provider-blocked, sending, sent, or failed delivery states in this slice.
- Use contact readiness as display-only local UI derived from the existing customer record. Do not add a new hook, server route, provider readiness endpoint, feature flag, or domain model yet.
- Keep "No contact saved" low priority: active/opened, active/never-opened, multiple-active, loading, error, and no-active-link states should remain the dominant readiness messages.

## Defer

- Provider-approved `POST /api/portal/send` or equivalent route.
- Provider readiness signal, delivery channel choice, send persistence, resend labels, retry flow, provider-blocked copy, delivery polling, and resend throttling.
- Persistent token audit events or send event tables.
- Contact edit shortcuts and no-expiration send warnings.

## Reject

- Any direct Supabase access from `CustomerPortalLinks`.
- Any service-role, raw token, token hash, provider secret, or provider dashboard exposure.
- Any automatic email/SMS/webhook delivery in this slice.
- Any migration, RLS, token schema, or production mutation as part of this UI-boundary pass.

## Next Codex Implementation Recommendation

Implement a no-provider `CustomerPortalLinks` contact-readiness pass:

1. Pass existing `customer.email` and `customer.phone` from `customers-client.tsx` into `CustomerPortalLinks`.
2. Add a low-priority "No contact saved" readiness card state for customers with no email or phone when no stronger active-link state is dominant.
3. Add focused customer portal link tests for contact-present and no-contact readiness behavior.
4. Update task/docs, run focused tests plus repository verification, and leave provider send/resend work for a later explicit provider-boundary slice.
