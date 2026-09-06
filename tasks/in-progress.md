# In Progress

## CR10 Node 24 LTS migration (running)

- Base `eee1726d2e78dc065db227474ff1419fc9bb97b8` (head of re-sequencing PR
  [#168](https://github.com/otto-agent007/pp/pull/168)), branch
  `codex/rebuild-cr10-node-24-v1`, plan
  `docs/superpowers/plans/2026-09-06-controlled-rebuild-cr10-node-24.md`.
- Frozen target Node `24.20.0` via `.nvmrc`, CI `node-version-file`,
  `engines.node >=24.20.0`, and `@types/node` on the 24 line. Vercel already
  runs 24.x.
- Controller approved platform-first sequencing, the target refresh, and the
  CR10 start on 2026-09-06. Publication and merge remain controller gates.

## Controlled rebuild

- CR00 is `done` (PR [#146](https://github.com/otto-agent007/pp/pull/146),
  merge `8f1e6cc4d1ea56a360e77c8ed36ec2fe8c315df2`). The recovery PRs
  [#147](https://github.com/otto-agent007/pp/pull/147) and
  [#149](https://github.com/otto-agent007/pp/pull/149) are merged. CR08, CR16,
  and CR17 are superseded into CR09, CR15, and CR18.
- PR [#168](https://github.com/otto-agent007/pp/pull/168) re-sequences the
  graph so the platform chain (CR10, CR11, CR12, CR13, CR14, CR15) runs
  before the CR01-CR09 architecture refactor.
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
  [#167](https://github.com/otto-agent007/pp/pull/167) is open.
- Deferred follow-ups: enforcing CSP after collecting reports from
  `/api/csp-report`; URL encoding in the remaining GitHub MCP server tool files
  (`issues.ts`, `repos.ts`, `commits.ts`, `pulls.ts`); Supabase leaked-password
  protection (paid plan); `onlyBuiltDependencies` alongside the pnpm rebuild
  node; an operator-assisted preview smoke run of the new RLS policies and
  triggers.
