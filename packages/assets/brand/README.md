# Brand Assets

Current logo options and intended roles:

| Asset | Role | Minimum rendered width |
| --- | --- | --- |
| `pest-patrol-logo-1-reference-match.svg` | Canonical reference mark for documentation, large previews, and source comparison. | 200px |
| `pest-patrol-logo-2-compact-header.svg` | Primary app-header candidate for web, portal, and compact branded UI. | 140px |
| `pest-patrol-logo-3-sticker-badge.svg` | Large accent, empty-state, setup-state, or marketing-adjacent mark. | 240px |

Keep logo filenames descriptive and lowercase. Preserve accessible `title` and
`desc` elements when editing SVGs.

For meaningful header or login use, keep root-level `role="img"` and
`aria-labelledby="title desc"` with product-facing title text. Do not add
per-path labels for individual wordmark layers. For decorative watermark or
empty-state usage, mark the rendered SVG as decorative in the consuming layer.

Test logo candidates on dark navy surfaces before wiring them into app headers:
the navy fills and strokes can visually merge into dark backgrounds. Use a
future light-on-dark variant rather than adding one-off brand colors.
