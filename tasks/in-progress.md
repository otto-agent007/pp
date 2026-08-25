# In Progress

## Controlled rebuild CR00 post-merge reconciliation

- PR [#146](https://github.com/otto-agent007/pp/pull/146) was squash-merged as
  `8f1e6cc4d1ea56a360e77c8ed36ec2fe8c315df2` on 2026-08-25. Its first `main`
  CI run failed because CR00 still claimed `running` and the reconciler treated
  original PR evidence commits as ancestors of the rewritten squash commit.
- Active recovery branch:
  `codex/rebuild-cr00-post-merge-reconcile-v1`, based on that exact merge SHA.
  Draft repair PR [#147](https://github.com/otto-agent007/pp/pull/147) is open.
  Initial clean-tree recovery verification passed all 17 gates before
  publication.
- The graph now records CR00 `done` at the canonical merge SHA. Reconciliation
  preserves the original evidence records by proving PR commit membership and
  exact equality between the original PR head tree and merged tree.
- Required recovery checks include the three focused control-plane test files,
  structural and offline/live graph reconciliation, the explicit
  `pnpm rebuild:verify -- --recovery-slice CR00` gate, root test/typecheck/lint/
  build/security gates, skill validation, TOML parsing, and `git diff --check`.
- CR01 remains `planned`; this repair does not promote it, create its branch, or
  begin implementation.
- Explicit exclusions remain unchanged: no application, dependency, lockfile,
  migration, provider, environment, preview, or production mutation.
