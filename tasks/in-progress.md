# In Progress

## GitHub MCP Form Data Security V1

- Active branch: `codex/github-mcp-form-data-security-v1`, started from the
  latest `origin/main` after Dependabot PRs #138 and #139 merged.
- The red standalone production audit reported one high-severity finding,
  GHSA-hmw2-7cc7-3qxx, against `form-data@4.0.5` through Axios 1.18.0.
- Update only the standalone GitHub MCP tool lock to `form-data@4.0.6` and its
  required `hasown@2.0.4` transitive resolution.
- The standalone production audit now reports zero vulnerabilities, and the
  clean install, resolved dependency-tree check, and TypeScript build pass.
- No application source, monorepo dependency graph, migration, environment,
  provider, preview, Supabase, or production mutation is in scope.
- Full repository tests, typecheck, lint, build, and security baseline pass.
  Draft PR [#143](https://github.com/otto-agent007/pp/pull/143) contains the
  verified repair; GitHub CI status is tracked on the PR.
