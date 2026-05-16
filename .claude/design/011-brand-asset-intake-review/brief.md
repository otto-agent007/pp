# Claude Design Brief: Brand Asset Intake Review

## Summary

Review the new Pest Patrol shared asset intake and logo candidates. Codex owns
repo hygiene, optimization, implementation, accessibility checks, tests, and
architecture boundaries; Claude should advise only on brand-fit, usage
hierarchy, visual clarity, and asset guidance.

## Files For Claude To Inspect

- `docs/ASSET_PIPELINE.md`
- `packages/assets/README.md`
- `packages/assets/brand/README.md`
- `packages/assets/brand/pest-patrol-logo-1-reference-match.svg`
- `packages/assets/brand/pest-patrol-logo-2-compact-header.svg`
- `packages/assets/brand/pest-patrol-logo-3-sticker-badge.svg`

The other asset bucket READMEs under `packages/assets/` provide supporting
context only.

## User Goal

Decide whether the shared asset package and three logo candidates are pointed in
the right direction before Codex wires any assets into app surfaces. The outcome
should help choose which logo variants belong in headers, navigation, customer
portal contexts, mobile route surfaces, marketing-adjacent moments, or future
empty/status states.

## Current State Claude Should Assume

- Pest Patrol OS has a token foundation documented in `docs/DESIGN_SYSTEM.md`.
- The brand palette already centers on navy, red, yellow, sky, green, slate,
  cream, and white token families.
- `docs/ASSET_PIPELINE.md` now allows durable shared assets in
  `packages/assets/` buckets.
- The shared asset package is new and not yet wired into app code.
- Three SVG logo options exist as candidates, not final implementation choices.

## Surfaces To Consider

- Web admin shell header and navigation
- Customer portal header and proof-of-service views
- Expo mobile technician signed-in route shell
- Empty, blocked, or setup states where a brand mark may support orientation
- Documentation or preview-smoke screenshots where a recognizable product mark
  is useful

## States And Contexts To Cover

- Light and dark app surfaces
- Compact mobile header use
- Larger desktop header or splash contexts
- Customer-safe portal contexts
- Small sizes where text legibility may collapse
- High-contrast field use in sunlight
- Decorative versus meaningful logo rendering

## Constraints

- Do not propose migrations, RLS changes, provider setup, map SDKs, environment
  changes, Vercel deploy changes, production mutations, or Figma canvas writes.
- Do not ask Codex to wire assets into app surfaces in this relay.
- Do not introduce new brand colors outside the existing token vocabulary unless
  clearly marked as a follow-up design recommendation.
- Preserve accessible `title` and `desc` intent for meaningful SVGs.
- Keep guidance compatible with `docs/ASSET_PIPELINE.md`: optimized, small,
  descriptive, lowercase, and hyphenated assets.
- Treat logo candidates as advisory visual inputs; Codex will decide final file
  names, optimization, exports, and implementation.

## Expected Claude Output

Write `proposal.md` with:

- Recommended role for each logo candidate: keep, revise, defer, or reject.
- Preferred primary logo for app headers and why.
- Guidance for compact/mobile use, customer portal use, and larger
  marketing-adjacent or documentation use.
- Notes on legibility risks, contrast risks, cropping/padding, and minimum-size
  concerns.
- Suggestions for accessible labels or descriptions when the mark is meaningful
  versus decorative.
- Any asset-pipeline wording or bucket-organization concerns, clearly separated
  from visual/logo guidance.
- Follow-up ideas clearly separated from this intake review.
