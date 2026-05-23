# Codex Review: Portal Customer Experience Polish V1

## Adopt

- Use the proposal as a narrow presentation-only polish pass for
  `apps/web/app/portal/[customerId]/portal-client.tsx`.
- Replace legacy portal color and focus classes with semantic token classes:
  `text-neutralDark` -> `text-theme-text-primary`, `text-secondary` ->
  `text-theme-text-secondary` or `text-theme-text-muted`, and
  `focus:border-primary` -> `focus:border-theme-action-primary`.
- Standardize customer-facing section labels with `Eyebrow` where it preserves
  the existing hierarchy for billing history, activity, completed jobs, and
  portal summary.
- Tighten the timeline hierarchy using muted timestamp text, primary event
  labels, and secondary note text without changing timeline data, copy source,
  or event filtering.
- Keep the portal customer-safe boundary intact: no exact GPS coordinates,
  internal notes, signed media URLs as text, raw tokens, token hashes, payment
  provider IDs, webhook metadata, or provider payloads.

## Adapt

- Do not blindly replace the in-card capture counters with `StatTile` if it
  creates card-inside-card chrome. `StatTile` renders through `Card`, so Codex
  should either keep those counters as compact tokenized mini-metrics or
  restructure the closeout header so the counters are not nested decorative
  cards.
- If `StatTile` is used for any portal counts, preserve the current compact
  layout at mobile widths and pass numeric values directly without string
  formatting churn.
- Preserve existing search behavior and placeholder copy. The brief asks for
  search across portal activity; this proposal is only token/header/counter
  polish and should not expand search semantics in the same slice.
- If invoice status already uses `StatusPill` in the live worktree, do not
  remove it just because the proposal lists it as a follow-up. The review
  boundary is no new invoice-state mapping or payment behavior.
- Keep all portal data access through the existing hooks/domain helpers. This
  slice should not change token validation, portal lookup, billing derivation,
  media URL handling, or customer-safe proof summarization.

## Defer

- Dedicated portal invoice detail pages, payment history drill-downs, or line
  item editing.
- New invoice status pill mapping if it is not already present in the current
  implementation.
- Timeline icons or event-type visual systems.
- Search layout, placeholder, filtering semantics, or new searchable fields.
- Any portal-token validation, payment provider, Supabase, seed/reset,
  migration, environment, preview, or production work.

## Reject

- Any direct Supabase read or write from the portal client.
- Any UI copy that exposes signed media URLs, exact technician GPS, raw portal
  tokens, token hashes, internal admin notes, provider message IDs, payment
  provider IDs, webhook URLs, or provider payloads.
- Any broad customer-portal redesign that changes what data the customer can
  see or changes billing/payment behavior.

## Implementation recommendation

Treat this as a small UI review slice only after the current dirty demo-flow
worktree is either intentionally owned by the slice or split into a clean
review surface:

1. Add focused portal tests for semantic token/header changes and capture-count
   rendering.
2. Implement the token/header cleanup without changing portal data shape.
3. Browser-check the tokened portal route at desktop and narrow widths with
   fixture proof media visible.
4. Run focused portal tests plus the repo gates required by `docs/AGENTS.md`.

## Implementation risks Codex must test

- Semantic token swaps must not alter customer-safe proof, billing, timeline,
  form, photo, or signature content.
- Capture counters must remain readable and not introduce nested-card visual
  clutter inside closeout cards.
- Search must continue to filter the same activity set and must not surface
  hidden URLs, tokens, provider IDs, or internal notes.
- Loading, empty, access-error, no-results, no-invoices, and no-timeline states
  must keep their current behavior and copy.
