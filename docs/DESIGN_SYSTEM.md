# Pest Patrol OS Design System

This foundation keeps Figma, code tokens, Tailwind, and React Native styles on
the same names. App code should use semantic tokens first, status tokens for
state indicators, and primitive colors only when creating or extending tokens.

## Primitive Palette

The source palette lives in `packages/ui-tokens/colors.ts` as `primitive`.

| Token | Value | Purpose |
| --- | --- | --- |
| `primitive/navy/950` | `#071A3D` | Primary text, inverse surfaces, strongest brand navy |
| `primitive/navy/900` | `#0A234F` | Deep brand surface support |
| `primitive/navy/800` | `#102F66` | Hover or layered navy support |
| `primitive/sky/50` | `#E0F2FE` | Info and route-state soft surfaces |
| `primitive/sky/100` | `#BAE6FD` | Info emphasis support |
| `primitive/sky/200` | `#7DD3FC` | Info borders |
| `primitive/sky/500` | `#0EA5E9` | Primary actions and en-route state |
| `primitive/sky/600` | `#0284C7` | Primary action hover and strong sky text |
| `primitive/red/50` | `#FEE2E2` | Error and danger soft surfaces |
| `primitive/red/100` | `#FECACA` | Error emphasis support |
| `primitive/red/200` | `#FCA5A5` | Error borders |
| `primitive/red/500` | `#E11D2E` | Danger actions and urgent state |
| `primitive/red/600` | `#C51628` | Danger hover and strong urgent text |
| `primitive/yellow/50` | `#FEF9C3` | Queued, warning, and review soft surfaces |
| `primitive/yellow/100` | `#FEF3C7` | Warning emphasis support |
| `primitive/yellow/200` | `#FDE68A` | Warning borders |
| `primitive/yellow/400` | `#FACC15` | In-progress status and warning emphasis |
| `primitive/yellow/500` | `#EAB308` | Strong warning support |
| `primitive/green/50` | `#DCFCE7` | Synced, success, and completed soft surfaces |
| `primitive/green/100` | `#BBF7D0` | Success emphasis support |
| `primitive/green/200` | `#86EFAC` | Success borders |
| `primitive/green/500` | `#16A34A` | Completed and success state |
| `primitive/green/600` | `#15803D` | Strong success text |
| `primitive/cream/50` | `#F6F2EA` | Historical warm neutral; do not use for app canvas |
| `primitive/slate/50` | `#F8FAFC` | Subtle light surfaces |
| `primitive/slate/100` | `#F1F5F9` | Subtle fills and separators |
| `primitive/slate/200` | `#E2E8F0` | Subtle borders |
| `primitive/slate/300` | `#CBD5E1` | Default borders |
| `primitive/slate/500` | `#64748B` | Muted text |
| `primitive/slate/700` | `#334155` | Secondary text |
| `primitive/slate/800` | `#1E293B` | Secondary text and dark surfaces |
| `primitive/slate/950` | `#0F172A` | Dark app canvas |
| `primitive/white` | `#FFFFFF` | Light app canvas, surfaces, and inverse text |

Do not reintroduce generic palette families such as `blue`, `emerald`, `amber`,
or `gray`. The old `palette` export remains only as an alias of `primitive`.

## Semantic Themes

Use `lightTheme` for the default admin/web/mobile interface and `darkTheme` for
dark contexts. `customerTheme` intentionally aliases `lightTheme` so customer
surfaces share the same product vocabulary instead of becoming a separate visual
system.

The default light app canvas is white. Preserve cream as a primitive reference
only; page, auth, admin shell, and route backgrounds should use
`semantic/light/background/canvas` or `neutralLight` rather than
`primitive/cream/50`.

Core semantic paths:

- `semantic/light/background/canvas`
- `semantic/light/background/surface`
- `semantic/light/background/subtle`
- `semantic/light/border/default`
- `semantic/light/border/subtle`
- `semantic/light/text/primary`
- `semantic/light/text/secondary`
- `semantic/light/text/muted`
- `semantic/light/action/primary`
- `semantic/light/action/primary-strong`
- `semantic/light/action/danger`
- `semantic/status/scheduled`
- `semantic/status/en-route`
- `semantic/status/in-progress`
- `semantic/status/completed`
- `semantic/status/urgent`
- `semantic/dark/background/canvas`
- `semantic/dark/background/surface`
- `semantic/dark/background/subtle`
- `semantic/dark/border/default`
- `semantic/dark/text/primary`
- `semantic/dark/text/secondary`
- `semantic/dark/text/muted`
- `semantic/dark/action/primary`
- `semantic/dark/action/primary-strong`
- `semantic/dark/action/danger`

Tailwind exposes matching paths:

```tsx
<section className="bg-semantic-light-background-canvas text-semantic-light-text-primary">
  <button className="bg-semantic-light-action-primary text-semantic-light-text-inverse">
    Save route
  </button>
</section>
```

React Native imports the same source values:

```ts
import { lightTheme, spacing } from "@pest-patrol/ui-tokens";

const card = {
  backgroundColor: lightTheme.background.surface,
  borderColor: lightTheme.border.subtle,
  color: lightTheme.text.primary,
  padding: spacing[4],
};
```

## Consuming Tokens

Use semantic tokens at app callsites. Reach for primitives only when extending
the token system itself or building an intentionally raw asset preview.

Web surfaces should prefer Tailwind token utilities from
`apps/web/tailwind.config.ts`:

```tsx
<article className="border-theme-border-subtle bg-theme-background-surface text-theme-text-primary">
  <p className="text-theme-text-muted">Route notes sync after the visit.</p>
</article>
```

Mobile surfaces should import token values from `@pest-patrol/ui-tokens` and
compose them in shared style helpers before passing them to components:

```ts
import { lightTheme, spacing } from "@pest-patrol/ui-tokens";

export const routeCard = {
  backgroundColor: lightTheme.background.surface,
  borderColor: lightTheme.border.subtle,
  padding: spacing[4],
};
```

Status tokens are for visual treatment only. Keep labels, ordering, permission
checks, and readiness rules in shared domain code, then map the resulting state
to a status token in the consuming UI.

Do not add app-level hex values, arbitrary hex Tailwind classes, or generic
palette utilities such as `bg-blue-500`, `text-gray-600`, or `border-amber-200`.
If a needed color is missing, add or extend a semantic token in
`packages/ui-tokens` first, then consume that token from web or mobile.

Brand skins are the only approved V1 exception for company-specific sidebar and
identity colors. Add those values in the reviewed `packages/ui-tokens`
brand-skin config and consume them through exported helpers or CSS variables;
do not add one-off brand hex values inside app components.

The root lint command runs `tooling/no-hardcoded-hex.ts` before package linting.
That guard scans app code for one-off hex values and generic palette utilities;
keep new token consumption inside the established token paths so the guard stays
green.

## Mobile Route Shell Pilot

The first token pilot is the Expo technician route shell. Route-specific style
composition lives in `apps/mobile/src/styles/routeShellStyles.ts` and consumes
`@pest-patrol/ui-tokens` directly.

The pilot covers the signed-in route surface, technician header, sync confidence
panel, route timeline, assigned-job card, and visit-flow wrapper. It does not
redesign individual capture controls such as GPS, chemical logs, photos,
signatures, or treatment-form internals.

## Status Rules

`lightTheme.status` is the compact semantic status set for Figma and shared UI:

- `scheduled`: slate
- `enRoute`: sky
- `inProgress`: yellow
- `completed`: green
- `urgent`: red

`packages/ui-tokens/status.ts` also exports visual badge objects for existing
operational categories: jobs, invoices, inventory, sync, and alerts. These
objects include `fg`, `fgStrong`, `bg`, `border`, and `solid`.

Status tokens are visual mappings only. They must not become the source of
labels, workflow order, permission checks, or business logic. Pair every status
color with visible text or an icon so color is never the only signal.

## Figma Contract

Figma variables should mirror code paths exactly. Use slash-delimited names like
`primitive/navy/950`, `semantic/light/background/canvas`, and
`semantic/status/en-route`; avoid labels such as `Blue 1`, `Red accent`, or
`Dark bg`.

The code export `figmaColorVariables` is the checklist for a Figma sync:

```ts
import { figmaColorVariables } from "@pest-patrol/ui-tokens";
```

The intended flow is:

```text
Figma variable -> ui-token -> Tailwind theme -> web component
Figma variable -> ui-token -> React Native style -> mobile component
```

## Motion Rules

Motion tokens live in `packages/ui-tokens/motion.ts`. Durations are numbers so
they work in React Native; easing values are CSS strings for web transitions.

- `instant`: no animation for immediate state changes.
- `fast`: hover, press, and simple opacity feedback.
- `base`: routine panel, badge, and control transitions.
- `slow` and `slower`: reserved for larger view changes.
- Respect reduced-motion preferences and keep core workflows usable without
  animation.

## Accessibility Notes

- Target WCAG AA contrast for all text and critical controls.
- Keep focus states visible and use `semantic.light.action.primary` or an
  equivalent ring color.
- Do not communicate status by color alone. Include text, shape, or iconography.
- Keep field workflows fast, minimal, and readable in sunlight.
- Preserve large tap targets on mobile and avoid dense controls that require
  precise touch input.
- Prefer semantic tokens over one-off hex values so light and dark contexts can
  stay accessible together.
