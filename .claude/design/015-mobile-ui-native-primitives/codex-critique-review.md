# Codex Critique Review: Mobile UI Native Primitives V1

This marker processes Claude's post-implementation critique for 015. It is
review-only: no app or package code changes are included in this relay update.

## Valid findings to fix in the next narrow cleanup

- Add `StatTile` test coverage for the absent-detail path so a tile with only
  value and label proves it does not render stray detail copy.
- Add `Button` size assertions for `sm` and `lg`, especially confirming the
  deliberate `sm` touch-target override remains `minHeight: 44` and `lg`
  remains `minHeight: 48`.
- Add an `Avatar` `sm` size assertion so the smallest tokenized dimensions are
  under test.
- Preserve the implementation decision that `Button` `sm` changes horizontal
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

## Verification needed after fixes

- Run focused `@pest-patrol/ui-native` tests after adding the missing size and
  optional-detail assertions.
- If package or app wiring changes, confirm `apps/mobile/package.json`,
  `pnpm-workspace.yaml`, `turbo.json`, and TypeScript config still include the
  native package correctly.
- For any code follow-through, run the relevant focused tests plus the repo
  gates required by `docs/AGENTS.md`, ending with `git diff --check`.
