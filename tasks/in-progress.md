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
  `tasks/done.md`. CR12 (Next.js 16) is next in `preferredPrOrder`.
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
