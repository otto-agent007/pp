# Codex Review: Mobile UI Native Primitives

## Adopt

- Create `packages/ui-native` as `@pest-patrol/ui-native`, separate from
  `@pest-patrol/ui`, with `@pest-patrol/ui-tokens` as the shared design bridge.
- Keep the package presentation-only: React Native primitives, token mappings,
  no hooks, no stores, no domain imports, no API-client imports, and no
  Supabase/provider access.
- Implement the six scoped primitives: `Button`, `Card`, `Eyebrow`,
  `StatusPill`, `StatTile`, and `Avatar`.
- Mirror the web primitive vocabulary where React Native allows it: shared
  status tones, button variants/sizes, card padding/tone, status-pill `dot`,
  and avatar sizes.
- Preserve the targeted migration boundary: `AssignedJobCard` moves to shared
  native `StatusPill`, and `MobileTechnicianHeader` Language/Sign Out controls
  move to shared native `Button`.
- Keep `SearchableSelect`, broad route-shell restyling, capture-control
  migration, dark mode, offline badge work, and native picker/combobox work out
  of this slice.
- Use Vitest for `packages/ui-native`, matching the monorepo package test
  pattern already used by `@pest-patrol/ui` and the current package setup.

## Adapt

- Export tone types with the same simple names used by the package components
  (`StatusPillTone`, `ButtonVariant`, etc.) from `@pest-patrol/ui-native`.
  Do not move tone unions into `@pest-patrol/types` in this slice; shared
  visual-tone contracts are presentation concerns for now, and moving them
  would expand the blast radius.
- Keep `routeShellStyles.ts` and `mobileCaptureControlStyles` intact. The new
  package should supplement the route shell, not become a broad mobile restyle.
- Treat `Button` `sm` sizing conservatively. It can use smaller typography and
  horizontal padding, but the touch target should still stay at least 44px high
  in migrated app surfaces.
- Allow `style` passthroughs on `Button`, `Card`, and text-like primitives when
  needed for native layout composition, but keep token defaults in the shared
  component.
- Confirm token paths against the actual `@pest-patrol/ui-tokens` exports while
  implementing. The current package can use exported `primitive` tokens, but
  palette choices should stay within existing semantic/primitive families
  rather than adding raw color values.
- Keep status tone derivation in the app/domain boundary that already knows job
  status. The primitive should render a supplied tone; it should not import job
  types or derive business state.
- For Expo/native conventions, keep implementation to React Native primitives
  already supported by the app. Do not introduce custom native modules,
  `react-native-svg`, provider SDKs, or Expo config changes.

## Defer

- Moving shared visual tone unions into `packages/types`.
- Deleting or collapsing `routeShellStyles.ts`.
- Migrating `JobStatusControls`, `JobChemicalLogForm`, `JobPhotoUploadForm`,
  `JobSignatureCaptureForm`, `JobTreatmentForm`, `SyncStatusIndicator`, or
  route-timeline rows beyond the two approved proof points.
- A native `SearchableSelect` / modal picker equivalent.
- Dark mode or theme-context support.
- Offline badge primitive.
- Any broad mobile screen redesign or app-shell navigation restructure.

## Reject

- Any package design that depends on `@pest-patrol/ui` web components,
  Tailwind, browser-only APIs, Supabase, API-client, domain logic, or mobile
  stores.
- Any migration that makes mobile actions online-only, blocks offline field
  work, changes queue contracts, or changes auth/provider behavior.
- Adding schema, RLS, provider setup, environment variables, preview or
  production mutations, app-chrome logo swaps, or new brand/font promotion.

## Answers to Claude's open questions

- `NativeStatusPillTone` re-export: use `StatusPillTone` from
  `@pest-patrol/ui-native` for this package. Do not move tone unions into
  `@pest-patrol/types` yet.
- `routeShellStyles.ts` long-term: keep it until multiple follow-up slices have
  migrated capture controls or offline indicators. Deletion is a future cleanup,
  not part of 015.
- `primitive.*` token access: exported `primitive` token access is acceptable
  for the avatar palette, with fallback to existing semantic tokens only if a
  specific primitive path is unavailable.
- Test runner: use Vitest for `packages/ui-native` to match this monorepo's
  existing package tests.

## Implementation recommendation

Treat the already-present dirty mobile-native worktree as the implementation
surface for this proposal, but keep review scope explicit before staging:

1. Confirm `packages/ui-native` has focused tests for all six primitives,
   variants, disabled/pressed/full-width behavior, optional dots, avatar
   initials/palette, and stat-tile detail.
2. Confirm `apps/mobile/src/components/AssignedJobCard.tsx` receives a tone
   prop and uses `StatusPill` without importing business logic into the shared
   package.
3. Confirm `apps/mobile/src/components/MobileTechnicianHeader.tsx` uses
   `Button` only for Language and Sign Out, leaving other route shell styles
   alone.
4. Verify package wiring in `apps/mobile/package.json`, `pnpm-lock.yaml`,
   `turbo.json`, and TypeScript config without broad dependency churn.
5. Run focused package/mobile tests, then the full repo gates required by
   `docs/AGENTS.md` before marking the implementation complete.

## Implementation risks Codex must test

- Shared native components must remain token-driven and free of raw color
  values.
- `Button` must preserve a usable mobile touch target after migration.
- `StatusPill` migration must not change job status labels or offline workflow
  behavior.
- `@pest-patrol/ui-native` must not pull React Native into web bundles through
  accidental imports from `@pest-patrol/ui`.
- The new package must be included in monorepo test, lint, typecheck, and build
  orchestration before the slice is closed.
