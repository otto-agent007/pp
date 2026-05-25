# Codex Critique Review: Mobile UI Native Primitives V1

This marker processes Claude's post-implementation critique for 015. It now
includes the narrow package-test follow-through for the accepted findings.

## Adopted in cleanup

- Added `StatTile` test coverage for the absent-detail path so a tile with only
  value and label proves it does not render stray detail copy.
- Added `Button` size assertions for `sm` and `lg`, confirming the deliberate
  `sm` touch-target override remains `minHeight: 44` and `lg` remains
  `minHeight: 48`.
- Added an `Avatar` `sm` size assertion so the smallest tokenized dimensions are
  under test.
- Preserved the implementation decision that `Button` `sm` changes horizontal
  padding and typography, not the minimum mobile touch target.

## Deferred follow-ups

- Document the `Button` size semantics if package-level docs or a native UI
  skill note is added later.
- Keep the avatar palette's `primitive.slate[200]` substitution as a valid
  contrast-minded implementation choice. Revisit palette rules only if the
  palette expands.
- Keep the `StatTile` value-color reuse of `statusPillToneStyles` for V1.
  Split it into a dedicated tone map only if future StatTile tones need to
  diverge from StatusPill tones.
- Defer normalizing the remaining `MobileTechnicianHeader` inline style
  objects. That pattern predates 015, and the approved migration only covered
  Language and Sign Out buttons.

## Rejected or out of scope

- Do not broaden 015 into capture-control migration, SyncBadge follow-through,
  native picker work, dark mode, route-shell deletion, or mobile screen
  redesign.
- Do not move visual tone unions into `packages/types` as part of this critique
  pass.
- Do not add React Native dependencies to web packages, provider SDKs, schema
  changes, RLS changes, env changes, preview mutations, or production
  mutations.

## Verification completed after fixes

- `corepack pnpm --filter @pest-patrol/ui-native test` passed after adding the
  size and optional-detail assertions.
- Focused web route tests for the already-implemented 014/016/017 critique
  surfaces passed.
- Full repo gates passed with `corepack pnpm test`,
  `corepack pnpm typecheck`, `corepack pnpm lint`, `corepack pnpm build`, and
  `git diff --check`.
- No package or app wiring changed, so `apps/mobile/package.json`,
  `pnpm-workspace.yaml`, `turbo.json`, and TypeScript config remained
  untouched.
