# Pest Patrol OS Asset Pipeline

This project does not add large image assets by default. Add assets only when
they improve task completion, comprehension, or brand recognition, and keep
them optimized before commit.

## Format Rules

Use SVG for:

- Icons, logos, simple vector marks, and UI symbols.
- Assets that need crisp rendering at any size.
- Small inline graphics where color can be themed through CSS.

Use WebP for:

- Product, workflow, and environmental raster imagery.
- Illustrations or photos where compression savings matter.
- Responsive web images with multiple sizes.

Use PNG for:

- Screenshots, transparent raster assets, and fallback images.
- Images that must preserve exact pixels.
- Temporary QA artifacts only when they are intentionally documented and small.

Use Lottie for:

- Small optional motion states such as loading, success, or empty-state accents.
- Animations that are not required to understand or complete a workflow.
- Cases with a reduced-motion fallback and a static equivalent.

## Usage Rules

- Do not commit large image assets in foundation slices.
- Prefer UI icons from the app's icon library before adding custom SVGs.
- Keep asset names descriptive, lowercase, and hyphenated.
- Store durable shared assets in `packages/assets/` using the `brand/`,
  `icons/`, `status/`, `map/`, and `empty-states/` buckets. Surface-specific
  temporary assets may still live near the owning app until promoted.
- Provide alt text or accessible labels for meaningful imagery.
- Mark decorative images as decorative in the rendering layer.

## Optimization Rules

- Optimize SVGs before commit and remove editor metadata.
- Export WebP images at the rendered size plus one high-density variant when
  needed.
- Keep PNGs for exactness, not as the default photo format.
- Avoid dark, blurred, or generic stock-like imagery when users need to inspect
  real product, route, job, customer, or proof-of-service content.
- Do not use Lottie for required feedback unless an equivalent text state is
  visible and usable without motion.

## Accessibility And Performance

- Every meaningful asset needs a text alternative.
- Motion must respect reduced-motion preferences.
- Images should not block the first usable view of operational screens.
- Asset choices should support field use: clear, fast-loading, and readable on
  mobile devices.
