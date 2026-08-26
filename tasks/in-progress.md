# In Progress

## Controlled rebuild CR01 executable architecture foundation

- CR00 recovery PR [#147](https://github.com/otto-agent007/pp/pull/147) was
  squash-merged as `3630dbb3ecaf4361dc059a974246e688f473bcf2` on
  2026-08-25. Structural, offline, and live reconciliation passed before CR01
  selection, and that exact merge commit is the CR01 base.
- Active branch: `codex/rebuild-cr01-foundation-v1`. CR01 is the sole running
  controlled-rebuild node.
- The approved design direction creates an executable architecture boundary
  without editing packages or application behavior. It records exact current
  dependency debt and assigns removal to CR05 and CR08 while preventing new or
  silently stale exceptions.
- Written specification:
  `docs/superpowers/specs/2026-08-25-controlled-rebuild-cr01-foundation-design.md`.
  The controller approved that committed specification and directed
  implementation on 2026-08-25.
- Detailed TDD implementation plan:
  `docs/superpowers/plans/2026-08-25-controlled-rebuild-cr01-foundation.md`.
  Implementation is authorized task by task; publication, source tagging, and
  merge remain separate controller gates under the rebuild runbook.
- The versioned boundary policy, TypeScript checker/tests, root scripts, graph,
  plan, and canonical architecture documentation are implemented on this
  branch. The focused policy suite passed 74/74 tests; the root test command
  passed 170/170 tests plus 7 Turbo tasks; and `pnpm architecture:check`
  validates 9 present workspace packages with 2 matched exceptions.
- Full typecheck, lint, build, security, and provenance verification have not
  run. The branch has not been pushed or source-tagged, no CR01 PR exists, and
  no approval or completion is claimed.
- Scope remains the canonical architecture docs, the versioned boundary policy,
  its checker/tests, root scripts, graph, plan, and this tracker. Exact path
  ownership is recorded in the graph.
- Excluded: package or app implementation changes, dependency or lockfile
  changes, package scaffolding, migrations, RLS, providers, environments,
  previews, and production.
