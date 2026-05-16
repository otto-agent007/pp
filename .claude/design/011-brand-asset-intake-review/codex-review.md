# Codex Review: Brand Asset Intake Review

## Adopt

- Use `pest-patrol-logo-2-compact-header.svg` as the preferred primary candidate for app headers, navigation, customer portal headers, and any compact branded UI.
- Keep `pest-patrol-logo-1-reference-match.svg` as the canonical/reference candidate for documentation, larger preview contexts, and future source comparison.
- Keep `pest-patrol-logo-3-sticker-badge.svg` only for large accent, empty, setup, or marketing-adjacent contexts where the heavier sticker treatment has room to breathe.
- Respect the proposed minimum-size guidance before wiring the wordmark into compact surfaces.
- Preserve meaningful SVG accessibility at the root level and mark decorative/logo-watermark rendering as decorative in the consuming layer.
- Optimize production-destined SVGs before shipping and remove editor metadata where practical.

## Adapt

- Do not wire logos into app code as part of this relay. Use this proposal to inform a later implementation slice.
- When a logo file is promoted to production header use, simplify the root title to a product-facing label such as `Pest Patrol` or `Pest Patrol OS`.
- Remove redundant per-path `aria-label` attributes only in production-ready asset cleanup, after confirming the root title and description still give the right accessible name.
- Treat dark-surface concerns as a real risk to test, not as approval to create new brand colors or token values.
- A usage table in `packages/assets/brand/README.md` is useful after final logo roles are approved, but it does not need to be added before asset intake is reviewed.

## Defer

- White or light-on-dark logo variant.
- Mark-only square asset for favicons, app icons, and sub-32px contexts.
- Flattened or outlined production exports.
- Softer customer-portal tone variant.
- App wiring, mobile login branding, customer portal branding, and documentation screenshot branding.

## Reject

- New brand colors outside the existing token vocabulary for this intake.
- Figma canvas writes, provider setup, map SDKs, environment changes, Vercel changes, migrations, RLS changes, production mutations, or schema changes.
- Large raster image additions or stock-like imagery in the shared asset package.
- Treating Claude's surface assignment as final implementation approval.

## Implementation risks Codex must test

- Logo 2 on light and dark header surfaces, especially navy backgrounds where navy strokes and fills may visually merge.
- Minimum rendered width and height in web header, portal header, and any mobile login/header use.
- Cropping and padding caused by the SVG viewBox and transformed groups.
- Accessible-name behavior after metadata cleanup.
- SVG optimization output to ensure it preserves the visual layered-stroke effect.
