# In Progress

## Controlled rebuild CR00 control plane

- Active branch: `codex/rebuild-cr00-control-plane-v1`, based on
  `origin/main` at `a95be1ef64ebc2d90ba15c5d6aa92b71446d1f03`.
- PR [#145](https://github.com/otto-agent007/pp/pull/145) is merged. Its merge
  commit is `a95be1ef64ebc2d90ba15c5d6aa92b71446d1f03`, which was
  `refs/remotes/origin/main` when CR00 started.
- CR00 establishes only the controlled-rebuild control plane: the versioned
  graph and pure validator, repository-fact reconciliation, mechanical
  verification, CI enforcement, CODEOWNERS, canonical runbook, bounded
  agent/skill guidance, and reconciled operating/task documentation.
- Required final checks include `pnpm rebuild:graph:check`, live
  `pnpm rebuild:graph:reconcile`, `pnpm rebuild:verify`, the three focused
  control-plane test files, `pnpm test`, `pnpm typecheck`, `pnpm lint`,
  `pnpm build`, `pnpm security:baseline`, all three repo-local skill
  validations, TOML/profile assertions, and `git diff --check`.
- Explicit exclusions: no application behavior change; the `package.json`
  change adds scripts only, while dependencies and the lockfile are unchanged;
  no migration; and no provider, environment, preview, or production mutation.
- Draft PR [#146](https://github.com/otto-agent007/pp/pull/146) is active.
  Review repair is in progress on the same branch and PR; CR00 has not claimed
  final post-repair verification or completion.
- CODEOWNERS is tracked. Because the repository currently has one trusted human
  maintainer, the owner-configured ruleset requires pull requests and the
  strict `verify` check, blocks deletion and force pushes, and has no bypass
  actors; required approvals are zero and required code-owner review is off to
  avoid self-deadlock. Stale-approval dismissal remains on, and automated
  reviews remain advisory. Add a second trusted human maintainer to CODEOWNERS
  before enabling one required approval and required code-owner review.
- CR00 remains `running` until the draft PR is reviewed and merged. Do not
  start CR01 implementation or open a second controlled-rebuild draft PR.
