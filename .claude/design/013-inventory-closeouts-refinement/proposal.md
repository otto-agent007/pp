# Claude Design Proposal: Inventory + Closeouts Refinement V1

Source: Claude Design result pasted by the user on May 21, 2026.

## Summary

Claude Design built `Inventory + Closeouts.html` as a single scrolling design
pass for the next admin UI slice.

The design intent is to refine, not replace, the existing Patrol OS admin feel:
bold field-command dashboard, strong brand presence, compact cards, readable
counters, practical status color, and operations-first density.

## Inventory Direction

Recommended `/inventory` hierarchy:

1. Header and filters.
2. Four stat tiles.
3. EPA/DPR compliance strip.
4. Low-stock review carousel.
5. Inventory table/list.
6. Selected-product detail rail.
7. Recent usage log.

Useful shared patterns:

- Counter tiles with compact labels and large tabular values.
- Filter tabs/selectors that preserve dense admin scanability.
- Low-stock status pills and stock-bar treatment.
- Alert/compliance strips that keep advisory-only copy visible without becoming
  workflow blockers.
- Selected-product detail panel for product facts, reorder status, and actions.

## Closeouts Direction

Recommended `/closeouts` hierarchy:

1. Header and filters.
2. Five-bucket counter strip.
3. Compliance alert strip.
4. Segmented filter tabs.
5. Queue list with evidence strip and tone-coded action.
6. Sticky 360px detail rail with GPS proof, evidence checklist, invoice
   handoff, and send/flag/request actions.

Useful shared patterns:

- Counter strip for proof-ready, missing-capture, GPS review, needs invoice,
  and billing-ready buckets.
- Queue rows with customer, address, date, status, and compact proof summary.
- Evidence micro-rows for GPS, forms, chemical logs, photos, signatures, and
  invoice handoff.
- Detail rail that keeps proof review and next actions visible while scanning
  the queue.

## State Matrix

Claude included state cards for:

- Loading
- Empty
- Error
- Blocked
- Ready
- Low-stock
- Missing-capture
- Proof-ready
- Invoiced
- Compliance-review

## Copy Guidance

Keep copy concise and operational:

- Inventory actions: "Save chemical", "Archive", "Log usage", "Open
  compliance".
- Closeout actions: "Open invoice", "Share portal", "Open customer ledger",
  "Create invoice", "Request missing captures", "Flag review".
- Empty states should name the next operator action rather than describe the UI.
- Compliance copy remains illustrative until wired to approved DPR/SDS source
  readiness.

## Claude Caveats

- GPS map and bar-chart usage trend are intentionally low-fidelity placeholders.
- Codex should choose any real map or chart implementation in a future slice.
- Compliance copy is illustrative and must remain advisory until source chunks
  are ingested.
- No new brand colors, font families, providers, migrations, or database access
  patterns were requested.
