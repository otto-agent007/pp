# Codex Critique Review: Brand Asset Intake Review

## Valid findings to fix now

- Clean only `pest-patrol-logo-2-compact-header.svg` for future promotion: set the root title to `Pest Patrol`, remove redundant per-path `aria-label` attributes, and strip obvious editor metadata while preserving path geometry and `paint-order`.
- Update `packages/assets/brand/README.md` with role assignments, minimum rendered sizes, dark-surface risk, and accessibility guidance.

## Deferred follow-ups

- White or light-on-dark logo variant.
- Mark-only square asset for sub-32px contexts, favicons, and app icons.
- App header, customer portal, mobile login, or documentation wiring.
- Flattened or outlined production exports if a later optimization pass needs them.

## Rejected or out of scope

- Do not wire logos into app code in this batch.
- Do not introduce new brand colors outside the current token vocabulary.
- No Figma canvas writes, provider setup, map SDKs, environment changes, Vercel changes, migrations, RLS changes, schema changes, or production mutations.

## Verification needed after fixes

- Confirm Logo 2 keeps root `role="img"`, `aria-labelledby="title desc"`, `<title>Pest Patrol</title>`, and a useful `<desc>`.
- Confirm Logo 2 has no `aria-label="PEST"` or `aria-label="PATROL"` attributes.
- Confirm `packages/assets/brand/README.md` documents usage without implying app wiring has happened.
