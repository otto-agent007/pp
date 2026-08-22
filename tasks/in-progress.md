# In Progress

## GitHub MCP Node Server Security V1

- Active branch: `codex/github-mcp-node-server-security-v1`, started from
  `origin/main` after Dependabot PRs #137, #134, and #136 merged.
- Dependabot PR #135 claimed to update `@hono/node-server`, but its resolved
  lock remained on vulnerable `1.19.14`; the recreate command was acknowledged
  without publishing a corrected head.
- Update only the standalone GitHub MCP tool lock to
  `@hono/node-server@1.19.17`, preserving MCP SDK 1.29 and Hono 4.13.3.
- The standalone production audit clears GHSA-frvp-7c67-39w9 and drops from
  five vulnerable packages (two high, two moderate, one low) to four (two
  high, one moderate, one low). Axios, form-data, qs, and body-parser remain
  separate follow-ups.
- No application source, monorepo dependency graph, migration, environment,
  provider, preview, Supabase, or production mutation is in scope.
- Draft PR [#140](https://github.com/otto-agent007/pp/pull/140) contains the
  verified repair; GitHub CI status is tracked on the PR.
