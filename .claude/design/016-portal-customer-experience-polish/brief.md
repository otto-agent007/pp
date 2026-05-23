# Portal Customer Experience Polish

## Target Screens

- `apps/web/app/portal/[customerId]`

## User Goal

Make the customer portal feel finished in the local demo flow: a customer should quickly understand services completed, invoice state, proof of service, and timeline activity without seeing admin-only or provider-only data.

## States

- Customer-safe summary, billing, timeline, proof, forms, photos, and signatures.
- Loading, empty, and access-error states.
- Search across portal activity.

## Constraints

- Presentation-only UI polish.
- Use existing `@pest-patrol/ui` primitives where they fit.
- Keep exact GPS, internal notes, provider metadata, signed media URLs as text, raw tokens, token hashes, and payment provider IDs hidden.
- Keep hooks/domain helpers as the data boundary.

## Non-Goals

- No portal token validation changes.
- No payment provider behavior changes.
- No Supabase writes, migrations, seed/reset, env, preview, or production changes.
