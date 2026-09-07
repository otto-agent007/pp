# In Progress

## Controlled rebuild

- CR00 is `done` (PR [#146](https://github.com/otto-agent007/pp/pull/146),
  merge `8f1e6cc4d1ea56a360e77c8ed36ec2fe8c315df2`). The recovery PRs
  [#147](https://github.com/otto-agent007/pp/pull/147) and
  [#149](https://github.com/otto-agent007/pp/pull/149) are merged. CR08, CR16,
  and CR17 are superseded into CR09, CR15, and CR18.
- PR [#168](https://github.com/otto-agent007/pp/pull/168) re-sequenced the
  graph so the platform chain (CR10, CR11, CR12, CR13, CR14, CR15) runs
  before the CR01-CR09 architecture refactor.
- CR10 (Node 24.20.0), CR11 (pnpm 12.3.4), and CR12 (Next.js 16.3.4) are
  `done`; details are in `tasks/done.md`.
- CR13 (Expo SDK 54) is `running` on `codex/rebuild-cr13-expo-54-v1`, draft PR
  [#176](https://github.com/otto-agent007/pp/pull/176), target frozen at
  `expo@54.0.37`, base `b5ce59feffd664319167567d3dcdca95cf9d3b25`. It also
  moves the repo-wide React pin to 19.1.0, which `react-native@0.81.5`
  requires. Merge and the `rebuild/cr13-source` tag remain controller gates.
  CR14 (SDK 55) and CR15 (SDK 56 to 57, floor 57.0.9) follow.
- Known follow-up carried out of CR12: 16 `eslint-plugin-react-hooks` v7
  findings in `apps/web` (13 `set-state-in-effect`, 2 `purity`, 1 `use-memo`)
  are tracked warnings, not fixes. Clearing them changes component behaviour
  and belongs in its own change.
- Known follow-ups surfaced by CR13's prebuilds, both pre-existing and
  behavioural, so tracked rather than changed inside a version migration:
  `apps/mobile/app.json` declares no `ios.bundleIdentifier` or
  `android.package`, so prebuild derives the placeholders
  `com.anonymous.pest-patrol-os` and `com.anonymous.pestpatrolos`; real
  identifiers are a product and provider decision needed before any store or
  EAS build. And `userInterfaceStyle: "automatic"` is inert on Android without
  `expo-system-ui`, which is not installed — adding it would switch dark mode
  on.

## Repository security refresh (2026-09-05 to 2026-09-06)

- Dependency, CI, Dependabot, and code-audit fix PRs
  [#152](https://github.com/otto-agent007/pp/pull/152) and
  [#158](https://github.com/otto-agent007/pp/pull/158) through
  [#166](https://github.com/otto-agent007/pp/pull/166) are merged; details live
  in `tasks/done.md`. Hygiene PR
  [#167](https://github.com/otto-agent007/pp/pull/167) is merged.
- Deferred follow-ups: enforcing CSP after collecting reports from
  `/api/csp-report`; Supabase leaked-password protection (paid plan);
  `onlyBuiltDependencies` now that pnpm 12 has landed; an operator-assisted
  preview smoke run of the new RLS policies and triggers; adding the CodeQL
  check to the `main` ruleset (needs an operator).
