# In Progress

## Controlled rebuild CR00 control plane

- Active branch: `codex/rebuild-cr00-control-plane-v1`, based on
  `origin/main` at `a95be1ef64ebc2d90ba15c5d6aa92b71446d1f03`.
- PR [#145](https://github.com/otto-agent007/pp/pull/145) is merged. Its merge
  commit is `a95be1ef64ebc2d90ba15c5d6aa92b71446d1f03`, which was
  `refs/remotes/origin/main` when CR00 started.
- CR00 establishes only the controlled-rebuild control plane: the versioned
  graph and validator, controlled-rebuild runbook, bounded agent/skill
  guidance, and reconciled operating/task documentation.
- Required final checks are `pnpm test`, `pnpm typecheck`, `pnpm lint`,
  `pnpm build`, `pnpm security:baseline`, graph validation via
  `pnpm rebuild:graph:check`, all three repo-local skill validations, TOML
  parsing, and `git diff --check`.
- Explicit exclusions: no application behavior change; the `package.json`
  change adds scripts only, while dependencies and the lockfile are unchanged;
  no migration; and no provider, environment, preview, or production mutation.
- Publication is pending until the final-review fixes, re-review, and fresh
  verification all pass. CR00 has no draft PR yet, and final verification has
  not yet been claimed.
