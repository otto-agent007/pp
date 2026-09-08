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
- CR10 (Node 24.20.0), CR11 (pnpm 12.3.4), CR12 (Next.js 16.3.4), and CR13
  (Expo SDK 54.0.37) are `done`; details are in `tasks/done.md`.
- **The controlled rebuild's platform chain is closed.** CR10 (Node 24.20.0),
  CR11 (pnpm 12.3.4), CR12 (Next.js 16.3.4), CR13 (Expo SDK 54.0.37), CR14 (Expo
  SDK 55.0.31) and CR15 (Expo SDK 57.0.20) are all `done`; details are in
  `tasks/done.md`.
- CR01 is `running` on `codex/rebuild-cr01-foundation-v2`, re-established on a
  fresh branch off the closed platform chain. The original draft PR
  [#148](https://github.com/otto-agent007/pp/pull/148) sat 86 commits behind
  `main` for twelve days; its content was carried across unchanged rather than
  rebased, because its value is three tooling files and two documents while its
  graph and tracker edits had to be rewritten against the current graph anyway.
  It touches no application code, so none of the platform-chain churn reached
  it. Two fixes were needed: a debt exception scheduled for removal in `CR08`,
  which is now superseded into CR09, and seventeen type errors in its test file
  that were latent from the start and only became visible once PR
  [#180](https://github.com/otto-agent007/pp/pull/180) put `tooling/` under
  `pnpm typecheck`.
- CR02-CR09 follow CR01 and each need their own controller promotion decision.
- A slice now needs only controller merge approval to land. Three control-plane
  changes removed the rest: PR
  [#178](https://github.com/otto-agent007/pp/pull/178) (no reconciliation PR and
  no red default branch), PR
  [#180](https://github.com/otto-agent007/pp/pull/180) (`tooling/` typechecked
  and linted), and PR [#182](https://github.com/otto-agent007/pp/pull/182)
  (source tags published automatically on merge).
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
