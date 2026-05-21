# Codex Review: Inventory + Closeouts Refinement V1

## Adopt

- Preserve the current Patrol OS admin look as the baseline rather than
  replacing it with generic SaaS chrome.
- Use shared UI primitives for repeated cards, buttons, stat counters, and
  status pills.
- Keep `/inventory` focused on scan-first chemical stock, low-stock review,
  EPA/DPR advisory context, create/edit/archive actions, usage logging, and
  recent usage.
- Keep `/closeouts` focused on queue filtering, proof readiness, capture
  evidence, invoice handoff, and next operator action.
- Preserve the saved before screenshots as durable relay references.

## Adapt

- Implement a presentation-only pass inside the current React/Tailwind
  structure. Do not add a new table framework, map provider, charting library,
  or sticky rail behavior unless it fits the current component boundaries.
- Use existing `@pest-patrol/ui` primitives. Add or adjust shared primitives
  only if a small backwards-compatible change removes real duplication.
- Treat the selected-product detail rail and usage trend as design direction,
  not required new behavior for this slice.
- Keep compliance copy tied to the current advisory-only app language until
  source-backed ingestion is approved.

## Defer

- Real GPS map tiles.
- Bar-chart usage trends.
- New charting or mapping dependencies.
- Any schema, provider, Supabase dashboard, preview, or production work.
- Promoting v3 wordmark/reference assets into active app chrome.

## Reject

- Direct database calls from UI components.
- Any design recommendation that changes hooks, API-client boundaries, domain
  logic, RLS, migrations, or provider configuration in this slice.

## Implementation Notes

- Target components: `/inventory` and `/closeouts`.
- Preserve current labels, filters, form validation, selected-job behavior,
  media rendering, and local demo data visibility.
- Verify with focused tests, full repo gates, and browser screenshots against
  the preserved references.
