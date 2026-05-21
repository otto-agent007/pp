# Claude Design Brief: Inventory + Closeouts Refinement V1

## User Goal

Refine the next Pest Patrol OS admin UI slice for `/inventory` and `/closeouts`
without erasing the current field-command dashboard feel.

The current look is protected design context: bold brand presence, compact
cards, readable counters, practical status color, and operations-first density
should be preserved and tightened through the Patrol UI Design System.

## Target Screens

- `/inventory`: chemical inventory, low-stock review, EPA/DPR compliance
  preview, create/edit/archive inventory, usage logging, and recent logs.
- `/closeouts`: billing work queue, completed-job proof review, capture
  readiness, GPS/proof evidence, invoice handoff, and queue filters.

## Current References

Reference screenshots are preserved in `references/`:

- `inventory-desktop-before.png`
- `inventory-narrow-before.png`
- `closeouts-desktop-before.png`
- `closeouts-narrow-before.png`

Treat these as the preserved "before" state, similar to inactive brand-logo
reference assets.

## Current State Claude Should Assume

- `@pest-patrol/ui` already provides shared `Button`, `Card`, `Eyebrow`,
  `StatusPill`, `StatTile`, and `Avatar` primitives.
- `@pest-patrol/ui-tokens` is the source for semantic colors, spacing, radius,
  typography, and shadows.
- Active product chrome uses the approved checked-in `wordmark.svg`,
  `wordmark-on-dark.svg`, and `logomark.svg` wrappers.
- Codex owns implementation, architecture, data flow, tests, verification, and
  GitHub hygiene.

## States To Cover

Loading, empty, error, blocked, ready, low-stock, missing-capture, proof-ready,
invoiced, selected, and compliance-review states.

## Constraints

- No migrations.
- No provider setup.
- No Supabase dashboard work.
- No production or preview mutations.
- No direct database calls from UI.
- No new brand/font promotion.
- No app-chrome logo swaps.
- Keep this presentation-only unless Codex explicitly approves a tiny shared UI
  primitive adjustment.

## Expected Claude Output

Claude should provide UI/design guidance only:

- Recommended information hierarchy for both screens.
- Shared UI-kit patterns for counters, filters, status pills, queue/list rows,
  detail panels, and alert/compliance strips.
- Concise admin copy for labels, helper text, empty states, and actions.
- Adopt/adapt/defer guidance for Codex.
