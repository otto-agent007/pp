# Codex Critique Review

Reviewed: May 20, 2026

## Scope

This pass processes the new `critique.md` for the brand-font direction relay. It is a design-reference closeout only: no app chrome, live brand asset, provider, environment, migration, preview, or production change is approved here.

The critique was written against the v3 reference handoff. The active branch did not yet contain those reference masters, so this review preserves them under `docs/design-system/assets/wordmark-options/v3/` before marking the critique processed.

## Adopt

- Preserve the condensed fleet-livery v3 masters as inactive reference assets only.
- Keep the dark-surface v3 candidate alongside the light-surface candidate.
- Keep the active app-shell lockups in `apps/web/app/brand` and `packages/assets/brand` unchanged.

## Adapt

- Added the Direction A / Option C naming resolution to `decisions.md` so future readers do not confuse the approved lead draft with the Inter fallback option.
- Expanded the pre-promotion gates to include the production `<title>` text decision and mobile lockup/minimum-size rules.

## Defer

- Type-designer/craft review of the asymmetric O curves.
- Trademark/legal diligence.
- Production `<title>` wording: `Pest Patrol` vs `Pest Patrol OS`.
- `packages/assets/brand/README.md` promotion table, minimum rendered widths, and dark-surface cautions.
- Any shield recut, tagline lockup, or app-shell promotion.

## Reject

- Do not replace `packages/assets/brand/wordmark.svg` or `wordmark-on-dark.svg` in this pass.
- Do not add runtime tagline toggles or change live UI behavior from this critique.
- Do not introduce migrations, provider setup, environment changes, dashboard mutations, preview mutations, or production changes.

## Verification Needed

- Docs-only verification: `git diff --check`.
- No code tests are required unless a later promotion slice changes app assets or UI wrappers.
