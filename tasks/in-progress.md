# In Progress

No implementation slice is running.

## Controlled rebuild

- CR00 is `done` (PR [#146](https://github.com/otto-agent007/pp/pull/146),
  merge `8f1e6cc4d1ea56a360e77c8ed36ec2fe8c315df2`). The recovery PRs
  [#147](https://github.com/otto-agent007/pp/pull/147) and
  [#149](https://github.com/otto-agent007/pp/pull/149) are merged. CR08, CR16,
  and CR17 are superseded into CR09, CR15, and CR18.
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
  in `tasks/done.md`.
- Deferred follow-ups: enforcing CSP after collecting reports from
  `/api/csp-report`; URL encoding in the remaining GitHub MCP server tool files
  (`issues.ts`, `repos.ts`, `commits.ts`, `pulls.ts`); Supabase leaked-password
  protection (paid plan); `onlyBuiltDependencies` alongside the pnpm rebuild
  node; an operator-assisted preview smoke run of the new RLS policies and
  triggers.
