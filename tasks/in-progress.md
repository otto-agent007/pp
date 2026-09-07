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
- CR10 (Node 24.20.0) and CR11 (pnpm 12.3.4) are `done`; details are in
  `tasks/done.md`.

## CR12 Next.js 16 migration (running)

- Base `d9a84c44035185bfee00aa8ac3d8230349726c88` (CR11's merge commit on
  `main`), branch `codex/rebuild-cr12-next-16-v1`, plan
  `docs/superpowers/plans/2026-09-07-controlled-rebuild-cr12-next-16.md`.
- Frozen target Next.js `16.3.4`. The app needed no application-code migration;
  the work is the framework bump, replacing the removed `next lint` with the
  ESLint CLI, and the ESLint 9 flat-config migration that
  `eslint-config-next@16` requires. Turbopack is now the production bundler.
- Controller approved the target refresh, the CR12 start, the ESLint 9 scope,
  and adopting Turbopack on 2026-09-07. Merge and the `rebuild/cr12-source` tag
  remain controller gates.
- Follow-up this slice deliberately does not do: 16 `eslint-plugin-react-hooks`
  v7 findings (13 `set-state-in-effect`, 2 `purity`, 1 `use-memo`) across 12
  components in `apps/web` are set to `warn`, not fixed. They are real React
  anti-patterns predating this slice; clearing them changes component behavior
  and belongs in its own change.
- CR01 is still `planned`. Draft PR
  [#148](https://github.com/otto-agent007/pp/pull/148)
  (`codex/rebuild-cr01-foundation-v1`, head
  `e0783e73ba9368be90ade0046e79cc706699f629`) conflicts with `main` after the
  2026-09-06 security merges and needs a rebase plus controller promotion
  approval before CR01 work resumes. Follow `docs/rebuild/README.md`.

## Repository security refresh (2026-09-05 to 2026-09-06)

- Dependency, CI, Dependabot, and code-audit fix PRs
  [#152](https://github.com/otto-agent007/pp/pull/152) and
  [#158](https://github.com/otto-agent007/pp/pull/158) through
  [#166](https://github.com/otto-agent007/pp/pull/166) are merged; details live
  in `tasks/done.md`. Hygiene PR
  [#167](https://github.com/otto-agent007/pp/pull/167) is merged.
- URL encoding for the remaining GitHub MCP server tool files (`issues.ts`,
  `repos.ts`, `commits.ts`, `pulls.ts`) is in draft PR
  [#171](https://github.com/otto-agent007/pp/pull/171), awaiting review.
- Deferred follow-ups: enforcing CSP after collecting reports from
  `/api/csp-report`; Supabase leaked-password protection (paid plan);
  `onlyBuiltDependencies` now that pnpm 12 has landed; an operator-assisted
  preview smoke run of the new RLS policies and triggers; adding the CodeQL
  check to the `main` ruleset (needs an operator).
