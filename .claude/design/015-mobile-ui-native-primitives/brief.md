# Claude Design Brief: Mobile UI Native Primitives

## User Goal

Create a `@pest-patrol/ui-native` shared package that mirrors the six core
`@pest-patrol/ui` primitives for React Native. The goal is to close the
cross-platform design-system gap: the web admin shell has shared, token-driven
UI primitives; the mobile technician app still uses hand-rolled style objects
and inline component patterns that are not shared, not typed to the same tone
vocabulary, and not reusable across future mobile screens.

This is a package-creation and light migration slice. It does not redesign any
existing mobile screen — it introduces a shared primitives package and migrates
a targeted set of inline patterns to use it.

## Target Package

`packages/ui-native` — name `@pest-patrol/ui-native`.

## Current State Claude Should Assume

- `@pest-patrol/ui` provides `Button`, `Card`, `Eyebrow`, `StatusPill`,
  `StatTile`, `Avatar`, `SearchableSelect`, and `buttonClassName` for web
  (React + Tailwind CSS). It has no React Native exports.
- `@pest-patrol/ui-tokens` is already consumed by both `@pest-patrol/ui` (web)
  and `apps/mobile/src/styles/routeShellStyles.ts` (mobile). It is the
  single source of truth for colors, spacing, radius, font size, and font
  weight.
- `apps/mobile/src/styles/routeShellStyles.ts` exports
  `mobileRouteShellPalette`, `mobileRouteShellStyles`,
  `mobileCaptureControlStyles`, `mobileRouteShellTone`, `getMobileSyncTone`,
  and `getVisitFlowTone`. These are app-local and consumed directly by
  `AssignedJobCard`, `MobileTechnicianHeader`, `SyncStatusIndicator`, and
  capture controls.
- `AssignedJobCard` defines an inline status pill (`statusPill`, `statusText`
  StyleSheet entries) rather than using a shared component.
- `MobileTechnicianHeader` uses inline `mobileRouteShellStyles.control` for
  its Language and Sign Out buttons rather than a shared component.
- No `@pest-patrol/ui-native` package exists yet.

## Components To Create

Six primitives, mirroring the web package's API where the platform allows:

1. `Button` — `Pressable` + `Text`. Variants: `primary`, `ghost`, `danger`,
   `subtle`. Sizes: `lg`, `md`, `sm`. Props: `onPress`, `disabled`,
   `fullWidth`, `variant`, `size`, `children`.
2. `Card` — `View` with token-driven border, radius, background, and padding.
   Padding variants: `lg`, `md`, `sm`, `none`. Tone variants: `surface`,
   `subtle`.
3. `Eyebrow` — `Text` with uppercase tracking and token-driven color. Tones:
   `accent`, `muted`, `danger`, `inverse`.
4. `StatusPill` — `View` + `Text` with tone-coded background, border, and
   foreground. Tones: `success`, `warning`, `danger`, `info`, `neutral`.
   Props: `tone`, `dot` (boolean, default true), `children`.
5. `StatTile` — `View` with a large value `Text` and a smaller label `Text`.
   Tones for value color: `success`, `warning`, `danger`, `info`, `neutral`.
   Props: `value`, `label`, `detail`, `tone`.
6. `Avatar` — `View` + `Text` for initials, with a 5-color palette derived
   from `name`. Sizes: `lg`, `md`, `sm`. Props: `name`, `size`.

`SearchableSelect` is web-only (keyboard-driven combobox). No React Native
equivalent in this slice.

## Migration Targets

After the package exists, migrate these two inline patterns to use it:

- `AssignedJobCard`'s inline `statusPill` + `statusText` styles → `StatusPill`
  from `@pest-patrol/ui-native`.
- `MobileTechnicianHeader`'s Language and Sign Out `Pressable` + inline
  `mobileRouteShellStyles.control` → `Button` variant `ghost` from
  `@pest-patrol/ui-native`.

All other mobile components are out of scope for this slice's migration step.

## Constraints

- No migrations.
- No provider setup.
- No Supabase dashboard work.
- No preview or production mutations.
- No direct database calls from UI.
- No new brand/font promotion.
- No app-chrome logo swaps.
- Do not add `react-native-svg` as a dependency unless Avatar's initials
  approach genuinely requires it (it does not — `View` + `Text` is sufficient).
- Keep `routeShellStyles.ts` in place. The new package supplements it; do not
  refactor all existing mobile styles in this slice.
- Keep the `@pest-patrol/ui-native` package presentation-only: no hooks, no
  stores, no domain imports, no Supabase access.

## Expected Claude Output

Write `proposal.md` with:

- Recommended API for each of the six components: prop signatures, variant
  enumerations, and token mappings.
- Touch target and spacing conventions for mobile.
- State coverage: default, pressed, disabled, each tone variant.
- Migration plan for the two targeted inline patterns.
- AGENTS conformance self-check.
- Follow-up ideas clearly separated from this slice.
