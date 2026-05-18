# Brand Assets

Current logo options and intended roles:

| Asset | Role | Minimum rendered width |
| --- | --- | --- |
| `wordmark.svg` | Primary full-color app wordmark for light surfaces and documentation previews. | 156px |
| `wordmark-on-dark.svg` | App-header wordmark variant for navy or other dark surfaces. | 156px |
| `logomark.svg` | Icon-only shield mark for compact branded surfaces, avatars, and future favicons. | 32px |
| `pest-patrol-logo-1-reference-match.svg` | Canonical reference mark for documentation, large previews, and source comparison. | 200px |
| `pest-patrol-logo-2-compact-header.svg` | Primary app-header candidate for web, portal, and compact branded UI. | 140px |
| `pest-patrol-logo-3-sticker-badge.svg` | Large accent, empty-state, setup-state, or marketing-adjacent mark. | 240px |

Keep logo filenames descriptive and lowercase. Preserve accessible `title` and
`desc` elements when editing SVGs.

`docs/design-system/` is a reference export for visual review. Do not treat its
CSS token draft as the app token source, and do not merge it into
`packages/ui-tokens` without a dedicated token-alignment slice.

Active product chrome should use `wordmark.svg`, `wordmark-on-dark.svg`, and
`logomark.svg` from the Claude Design `preview/brand-logos.html` handoff. Do not
swap in the `pest-patrol-logo-*` candidates as "approved" app logos unless a
new design review explicitly promotes them.

The approved wordmark lockups outline the visible text as SVG paths. Keep them
self-contained so app, docs, PDF, and presentation exports do not depend on
Inter or any fallback font being available at render time.

Web app shell usage lives in `apps/web/app/brand`. The React wrappers inline the
static SVG strings and suffix internal SVG IDs per instance so gradients and
filters do not collide when multiple marks render on one page.

For meaningful header or login use, keep root-level `role="img"` and
`aria-labelledby="title desc"` with product-facing title text. Do not add
per-path labels for individual wordmark layers. For decorative watermark or
empty-state usage, mark the rendered SVG as decorative in the consuming layer.

Test logo candidates on dark navy surfaces before wiring them into app headers:
the navy fills and strokes can visually merge into dark backgrounds. Use a
future light-on-dark variant rather than adding one-off brand colors.
