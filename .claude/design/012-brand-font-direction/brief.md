# Brand Font Direction Review

## User Goal

Decide whether Pest Patrol should keep the current Inter-based wordmark direction
or move toward a more distinctive brand font before final production logo
handoff.

## Current State

- Codex has outlined the approved active wordmark SVG text as paths in
  `packages/assets/brand/wordmark.svg` and
  `packages/assets/brand/wordmark-on-dark.svg` so the logos are self-contained.
- The app shell still uses the approved Claude Design lockups through
  `apps/web/app/brand`.
- Inactive font-direction mocks live under
  `docs/design-system/assets/wordmark-options/`.
- A standalone review bundle lives at
  `docs/design-system/exports/brand-wordmark-direction.html`.

## Review Surfaces

- Active baseline: current Inter Black Italic wordmark, light and dark variants.
- Option A: current Inter direction, path-outlined.
- Option B: Inter Display, path-outlined.
- Option C: condensed service-signage direction, path-outlined.

## Questions For Claude

1. Should Pest Patrol keep the product shell quiet and operational, or should
   the logo carry more local-service / truck-door personality?
2. Should the San Diego / Est. 1982 tagline remain part of the durable lockup,
   or should it become a contextual campaign/detail line?
3. Should the final brand lean modern SaaS, local-service heritage, or a
   controlled hybrid?

## Constraints

- Do not introduce new brand colors outside the existing token vocabulary.
- Do not promote inactive `pest-patrol-logo-*` assets back into app chrome unless
  the user explicitly reapproves them.
- Do not request migrations, providers, secrets, dashboard mutations, or
  production changes.
- Treat this as design advice only; Codex owns implementation and verification.

## Expected Output

Give a short recommendation across Options A/B/C, call out any dark-surface or
small-size risks, and list any edits needed before final logo production.
