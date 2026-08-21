# In Progress

## CI Test + Cross-Platform Path Guard V1

- Active branch: `codex/ci-test-path-guard-v1`, started from the latest
  `origin/main`.
- Make compliance source-path validation reject POSIX and Windows absolute
  paths on every host before reading source files.
- Run the existing root `pnpm test` command in CI so test failures cannot be
  hidden behind lint, typecheck, and build success.
- Done when the focused regression and full repository gates pass and the
  verified branch is pushed with a draft PR.
- No dependency upgrades, migrations, provider settings, environment changes,
  Supabase writes, preview mutations, or production mutations are in scope.
