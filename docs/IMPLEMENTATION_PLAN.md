# Implementation Plan

## Current Priority: Preview Launch Readiness

1. Treat PR #27 as merged and start readiness work from updated `main`.
2. Prepare an operator-assisted Vercel preview backed by an approved Supabase environment.
3. Keep provider dashboard changes, environment variable mutations, production data mutations, and migration application operator-approved only.
4. Use `docs/PREVIEW_LAUNCH_READINESS.md` as the launch punch list and `docs/PRODUCTION_READINESS.md` as the longer setup and smoke-test reference.
5. Leave `tools/` untouched because it is unrelated local MCP/tooling scratch.

## Next Decision Points

1. Decide which Supabase environment backs the first preview smoke run.
2. Decide whether optional portal and notification webhook providers are configured for preview or left in manual fallback mode.
3. Decide whether `/dispatch?technician=...` should preselect the technician filter in a follow-up slice.
4. Decide whether provider delivery receipts are needed after operator-assisted webhook smoke testing.
