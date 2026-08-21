# In Progress

## CI Test + Cross-Platform Path Guard V1

- Active branch: `codex/ci-test-path-guard-v1`, started from the latest
  `origin/main`.
- Make compliance source-path validation reject POSIX and Windows absolute
  paths on every host before reading source files.
- Run the existing root `pnpm test` command in CI so test failures cannot be
  hidden behind lint, typecheck, and build success.
- Draft PR: [#132](https://github.com/otto-agent007/pp/pull/132).
- The focused regression, full repository gates, security baseline, and
  whitespace checks pass locally; GitHub review and CI are pending.
- No dependency upgrades, migrations, provider settings, environment changes,
  Supabase writes, preview mutations, or production mutations are in scope.
